# Portal Web Analítico

Projeto 3 do curso de Engenharia de Dados - Portal Web Analítico com backend Python/FastAPI e frontend React/Vite.

## Descrição

Este projeto consiste em um portal web analítico com três áreas de conteúdo:
- Visão Geral
- Comercial
- Operacional

O backend é desenvolvido com FastAPI (Python) e o frontend com React + Vite.
O projeto suporta dois modos de fonte de dados:
- **Demo**: Utiliza arquivos CSV/JSON locais (sem dependência do GCP)
- **BigQuery**: Integração com o Google BigQuery (quando explicitamente configurado)

## Estado atual

- API FastAPI com `GET /` e `GET /health`.
- Fonte Demo CSV/JSON selecionada por padrão e carregada sob demanda.
- API analítica com visão geral, tendências, agregações comerciais, indicadores operacionais, filtros e detalhe de pedido.
- Configuração de `DATA_SOURCE` e `ENVIRONMENT` independente; BigQuery ainda não está implementado.
- Dados fictícios locais, sem dados pessoais ou sensíveis.

## Estrutura de Pastas

```
projeto_portal_analytics/
├── .gitignore
├── .env.example
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── data/
│   └── demo/
│       └── orders.csv
├── frontend/
└── docs/
    └── analytics-data-contract.md
```

## Executar a API Demo

Na pasta `backend/`, com as dependências de `requirements.txt` disponíveis:

```powershell
python -m uvicorn app.main:app --reload
```

A documentação interativa fica em `/docs`. O modo Demo não acessa serviços de nuvem. O arquivo `data/demo/orders.csv` é necessário para consultas analíticas, mas não para iniciar a API.

## Testes

Na pasta `backend/`:

```powershell
python -m unittest discover -s tests -v
```

## Contrato Analítico

Granularidade, campos, fórmulas dos KPIs, denominadores, filtros e respostas de erro estão descritos em [`docs/analytics-data-contract.md`](docs/analytics-data-contract.md).

## Frontend

Instruções de instalação, configuração de `VITE_API_BASE_URL`, desenvolvimento e build estão em [`frontend/README.md`](frontend/README.md).

## Licença

Este projeto está sob a licença MIT.