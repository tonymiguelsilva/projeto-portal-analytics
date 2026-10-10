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

## Funcionalidades

- Login simulado com perfis Admin e Comercial
- Ambientes DEV e PROD separados por configuração
- Zero custo recorrente obrigatório (modo demo funciona totalmente localmente)
- Versionamento com Git (branch `main` estável)

## Estrutura de Pastas

```
projeto_portal_analytics/
├── .gitignore
├── .env.example
├── README.md
├── backend/
│   └── app/
│       └── main.py
├── frontend/
├── data/
│   └── demo/
└── docs/
    └── arquitetura.md
```

## Como Executar (Modo Demo)

1. Clone o repositório
2. Copie `.env.example` para `.env` e ajuste as variáveis se necessário
3. Não é necessário instalar dependências nesta fase inicial
4. O backend e frontend serão implementados nas etapas posteriores

## Licença

Este projeto está sob a licença MIT.