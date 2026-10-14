# Linhagem de dados — DataClyra

Fluxo operacional atual: `data/demo/orders.csv → DemoDataSource → OrderRecord → AnalyticsService → API → filtros e permissões → dashboards DataClyra`.

Cada linha representa um pedido. Campos principais incluem datas, região, canal, categoria, unidades, receita bruta, desconto, custo e status. A receita líquida é receita bruta menos desconto; lucro bruto é receita líquida menos custo; pedidos cancelados não entram nas métricas financeiras. O escopo regional é aplicado pela sessão Demo antes dos filtros e cálculos.

As regras de qualidade validam contrato, unicidade, completude, unidades, valores monetários, datas e status. Os dados demonstrativos são locais, sem atualização automática externa.

Arquitetura de referência do Projeto 2 (não operacional e sem dependência do DataClyra): `PostgreSQL → Python → GCS → BigQuery Bronze → dbt Silver → dbt Gold`.
