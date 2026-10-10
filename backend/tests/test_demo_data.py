import csv
import unittest
from datetime import date
from decimal import Decimal
from pathlib import Path

from app.schemas.analytics import OrderRecord
from app.services.demo_data_source import DemoDataSource


class DemoDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        dataset_path = Path(__file__).resolve().parents[2] / "data" / "demo" / "orders.csv"
        with dataset_path.open(encoding="utf-8", newline="") as dataset_file:
            cls.csv_columns = next(csv.reader(dataset_file))
        raw_orders = DemoDataSource().load("orders.csv")
        cls.orders = [OrderRecord.model_validate(row) for row in raw_orders]

    def test_csv_has_exact_contract_columns(self) -> None:
        expected_columns = [
            "order_id",
            "order_date",
            "region",
            "sales_channel",
            "product_category",
            "customer_segment",
            "units",
            "gross_revenue",
            "discount_amount",
            "cost_amount",
            "status",
            "promised_delivery_date",
            "shipped_at",
            "delivered_at",
        ]

        self.assertEqual(self.csv_columns, expected_columns)

    def test_dataset_has_unique_synthetic_orders_across_twelve_months(self) -> None:
        order_ids = [order.order_id for order in self.orders]
        months = {order.order_date.strftime("%Y-%m") for order in self.orders}

        self.assertEqual(len(self.orders), 36)
        self.assertEqual(len(order_ids), len(set(order_ids)))
        self.assertEqual(len(months), 12)

    def test_records_cover_order_and_delivery_states(self) -> None:
        statuses = {order.status for order in self.orders}

        self.assertEqual(statuses, {"delivered", "shipped", "pending", "cancelled"})

    def test_money_fields_are_parsed_as_decimal(self) -> None:
        for order in self.orders:
            with self.subTest(order_id=order.order_id):
                self.assertIsInstance(order.gross_revenue, Decimal)
                self.assertIsInstance(order.discount_amount, Decimal)
                self.assertIsInstance(order.cost_amount, Decimal)
                self.assertEqual(
                    order.net_revenue,
                    order.gross_revenue - order.discount_amount,
                )

    def test_status_and_date_combinations_are_validated(self) -> None:
        valid_record = self.orders[0].model_dump()
        invalid_records = [
            {
                **valid_record,
                "delivered_at": None,
            },
            {
                **valid_record,
                "status": "shipped",
                "shipped_at": None,
                "delivered_at": None,
            },
            {
                **valid_record,
                "status": "pending",
                "delivered_at": None,
            },
            {
                **valid_record,
                "status": "cancelled",
            },
        ]

        for record in invalid_records:
            with self.subTest(status=record["status"], shipped_at=record["shipped_at"]):
                with self.assertRaises(ValueError):
                    OrderRecord.model_validate(record)

    def test_late_delivery_is_valid(self) -> None:
        record = self.orders[0].model_dump()
        record["promised_delivery_date"] = date(2025, 10, 5)

        late_order = OrderRecord.model_validate(record)

        self.assertEqual(late_order.status, "delivered")
        self.assertGreater(late_order.delivered_at, late_order.promised_delivery_date)

    def test_invalid_date_chronology_is_rejected(self) -> None:
        valid_record = self.orders[0].model_dump()
        invalid_records = [
            {**valid_record, "promised_delivery_date": date(2025, 10, 2)},
            {**valid_record, "shipped_at": date(2025, 10, 2)},
            {**valid_record, "delivered_at": date(2025, 10, 3)},
        ]

        for record in invalid_records:
            with self.subTest(record=record):
                with self.assertRaises(ValueError):
                    OrderRecord.model_validate(record)

    def test_invalid_discount_is_rejected(self) -> None:
        record = self.orders[0].model_dump()
        record["discount_amount"] = Decimal("1201.00")

        with self.assertRaises(ValueError):
            OrderRecord.model_validate(record)


if __name__ == "__main__":
    unittest.main()