# Contrato de Dados Analíticos Demo

## Fonte e granularidade

`data/demo/orders.csv` contém uma linha por pedido, com identificadores e valores inteiramente fictícios. A amostra cobre 12 meses, de outubro de 2025 a setembro de 2026. Não contém nomes, contatos, documentos, endereços nem dados pessoais.

O portal consome esse arquivo preparado. Não executa ETL, transformações de warehouse ou dbt. A API pode iniciar sem o CSV; a leitura ocorre sob demanda nas consultas analíticas.

## Campos

| Campo | Tipo | Definição |
| --- | --- | --- |
| `order_id` | texto | Identificador sintético único do pedido. |
| `order_date` | ISO date | Data de criação do pedido. |
| `region` | texto | Região comercial fictícia. |
| `sales_channel` | texto | Canal de venda: `online`, `loja` ou `parceiro`. |
| `product_category` | texto | Categoria de produto. |
| `customer_segment` | texto | Segmento empresarial agregado; não identifica clientes. |
| `units` | inteiro positivo | Unidades do pedido. |
| `gross_revenue` | Decimal não negativo | Valor bruto antes de descontos, em BRL. |
| `discount_amount` | Decimal não negativo | Desconto aplicado, em BRL. |
| `cost_amount` | Decimal não negativo | Custo associado ao pedido, em BRL. |
| `status` | enum | `delivered`, `shipped`, `pending` ou `cancelled`. |
| `promised_delivery_date` | ISO date | Data prometida para entrega. |
| `shipped_at` | ISO date ou vazio | Data de envio; obrigatória para `shipped` e `delivered`, vazia para `pending` e `cancelled`. |
| `delivered_at` | ISO date ou vazio | Data de entrega; obrigatória para `delivered`, vazia para `shipped`, `pending` e `cancelled`. |

`order_id` deve ser único. Datas de envio não podem anteceder a criação; entrega não pode anteceder o envio. Descontos não podem superar receita bruta. O schema rejeita campos desconhecidos e estados/datas incompatíveis.

Pedidos `pending` ainda não foram enviados. Pedidos `cancelled` são cancelados antes do envio e, por isso, não podem ter datas de envio ou entrega. Pedidos `shipped` já foram enviados, mas ainda não entregues. Pedidos `delivered` exigem as duas datas.

## Regras dos Indicadores

Os cálculos financeiros usam todos os pedidos não cancelados (`delivered`, `shipped` e `pending`), isto é, receita de pedidos válidos/registrados, não receita contábil reconhecida. Pedidos cancelados não entram em receita, ticket médio, unidades vendidas, lucro nem margem.

- **Receita líquida:** soma de `gross_revenue - discount_amount` dos pedidos válidos.
- **Pedidos válidos:** quantidade de pedidos não cancelados.
- **Ticket médio:** receita líquida dividida pelos pedidos válidos; `null` sem pedidos válidos. Arredondamento monetário em duas casas.
- **Lucro bruto:** receita líquida menos `cost_amount`, somados nos pedidos válidos.
- **Margem bruta:** lucro bruto dividido pela receita líquida, vezes 100; `null` se a receita líquida for zero.
- **Taxa de cancelamento:** pedidos cancelados divididos por todos os pedidos no período e após os demais filtros, vezes 100. `null` se o denominador for zero.
- **Entregas no prazo:** pedidos entregues até `promised_delivery_date` divididos por todos os pedidos entregues; pedidos abertos e cancelados não compõem o denominador. `null` se não houver entregas. Entregas atrasadas são válidas: permanecem no denominador e não entram no numerador, sendo necessárias para medir a pontualidade.
- **Prazo médio de entrega:** média de dias corridos entre `order_date` e `delivered_at`, somente para pedidos entregues. `null` se não houver entregas.
- **Pedidos em aberto:** pedidos nos estados `pending` ou `shipped`.

Percentuais são arredondados para duas casas. Comparações usam uma janela anterior de igual duração, imediatamente anterior ao início do período solicitado. Sem período explícito, a janela atual vai da menor à maior data disponível. A variação percentual é `(atual - anterior) / anterior * 100`; retorna `null` quando não há base anterior ou quando o indicador anterior é zero.

## API

Todos os endpoints analíticos usam `data/demo/orders.csv` sob demanda. `start_date` e `end_date` são inclusivos e aceitam ISO date; quando omitidos, são usados os limites do conjunto. Os filtros dimensionais são `region`, `channel`, `category` e `status`.

| Método e caminho | Resultado |
| --- | --- |
| `GET /api/v1/analytics/overview` | KPIs e variação em relação ao período anterior. |
| `GET /api/v1/analytics/trends` | KPIs agrupados por mês, incluindo meses sem pedidos. |
| `GET /api/v1/analytics/sales?dimension=category` | Agregados por `region`, `channel` ou `category`. |
| `GET /api/v1/analytics/operations` | Cancelamentos, entregas, prazo médio e pedidos em aberto. |
| `GET /api/v1/analytics/filters` | Valores disponíveis e intervalo de datas. |
| `GET /api/v1/analytics/orders/{order_id}` | Detalhe de um pedido; `404` se não encontrado. |

Datas inválidas, intervalo invertido ou dimensão inválida retornam `422`. Dataset ausente retorna `503` com `detail.code=analytics_data_unavailable`; dataset vazio, duplicado ou incompatível com o schema retorna `500` com `detail.code=analytics_data_invalid`. Ambos usam um envelope `detail` com `code` e `message`. Os endpoints existentes `/` e `/health` mantêm suas respostas e status.

## Sessão Demo e Escopo Regional

O login Demo não usa senha, credenciais externas ou autenticação de produção. Qualquer visitante pode escolher livremente qualquer perfil, inclusive `director_all`; portanto, este mecanismo não é uma fronteira de segurança e não deve ser usado como proteção de dados em produção.

| Método e caminho | Acesso | Resultado |
| --- | --- | --- |
| `GET /api/v1/demo-auth/profiles` | Público | Catálogo dos quatro perfis Demo. |
| `POST /api/v1/demo-auth/session` | Público | Cria sessão para `profile_id` informado no JSON. |
| `GET /api/v1/demo-auth/session` | `X-Demo-Session` | Retorna a identidade associada à sessão. |
| `DELETE /api/v1/demo-auth/session` | `X-Demo-Session` | Revoga a sessão; retorna `204`. |

O identificador retornado em `session_id` deve ser enviado no cabeçalho HTTP `X-Demo-Session` em todas as chamadas a `/api/v1/analytics/*`. A sessão expira após 3.600 segundos, é armazenada somente em memória e se torna inválida quando o backend reinicia. Cabeçalho ausente retorna `401` com `demo_session_required`; sessão inválida, expirada ou revogada retorna `401` com `demo_session_invalid`.

| `profile_id` | Papel | Regiões permitidas |
| --- | --- | --- |
| `analyst_south` | Analista | `Sul` |
| `manager_south` | Gerente | `Sul` |
| `manager_southeast` | Gerente | `Sudeste` |
| `director_all` | Diretor | Todas as regiões do conjunto Demo |

O backend resolve o perfil pelo identificador de sessão e aplica o escopo antes de calcular KPIs, tendências e comparações. Para perfis regionais, omitir o filtro `region` significa usar sua região autorizada; enviar outra região retorna `403` com `region_scope_conflict`. `/filters` lista apenas regiões permitidas. A consulta de pedido fora do escopo retorna `404` com `order_not_found`, sem revelar se o ID existe. O Diretor pode consultar todas as regiões ou escolher uma região no filtro. `/` e `/health` permanecem públicos e sem alteração de contrato.

## Testes

Na pasta `backend/`, execute:

```powershell
python -m unittest discover -s tests -v
```

Os testes cobrem o contrato e CSV, cálculos e denominadores, filtros, variações com e sem base comparativa, erros de dados e rotas ASGI reais. O modo Demo não requer BigQuery nem dependências adicionais.