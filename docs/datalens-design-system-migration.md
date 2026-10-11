# DataLens Design System: Preparação e Migração

## Tokens preparados

`frontend/src/styles/tokens.css` agora contém os tokens fundacionais DataLens para:

- Cores de marca: grafite `#111318`, preto `#090a0d`, superfície escura `#1B1E25`, vermelho `#E5484D`, texto claro `#F4F5F7` e texto secundário `#8D96A5`.
- Tipografia sans, display e monoespaçada, usando as famílias locais já adotadas pelo projeto.
- Espaçamentos em escala, raios de 10/12/16 px e pill, sombras e transições.
- Papéis de tema sob `:root[data-theme='light']` e `:root[data-theme='dark']`.

O HTML inicia com `data-theme="light"`. Os tokens novos usam o prefixo `--dl-` e ainda não controlam os componentes existentes; o tema atual e a aparência renderizada permanecem preservados nesta etapa.

## Etapa Atual: Shell e Sidebar

O shell principal já consome os papéis DataLens de canvas, superfície, texto, borda e sombra. A sidebar usa grafite, marca DataLens, ícones Lucide, perfil/região e saída com destaque vermelho contido. A navegação, o logout e o layout mobile permanecem funcionais. A página inicial dos dashboards continua clara; a alternância de tema ainda não foi ativada.

## Estilos legados que ainda precisam migrar

Na próxima etapa visual, substituir gradualmente os aliases verdes abaixo pelos papéis semânticos `--dl-theme-*`, depois de decidir o mapeamento final para a identidade grafite/vermelho:

- `frontend/src/styles/tokens.css`: `--ink`, `--ink-soft`, `--ink-muted`, `--paper`, `--panel`, `--line`, `--line-strong`, `--forest`, `--lime`, `--success` e `--warning` formam a paleta atual. Os aliases `--forest`, `--lime` e `--coral` devem ser mantidos durante a transição para evitar mudança involuntária de aparência.
- `frontend/src/styles/app.css`: as regras da sidebar foram migradas. Permanecem legados os estilos de conteúdo dos dashboards, incluindo cabeçalhos, destaque de valores, badge de período, anel operacional e indicadores vazios, que usam a paleta verde literal ou aliases.
- `frontend/src/styles/dashboards.css`: foco dos campos, destaque da navegação de dimensão, ícones e faixas dos KPIs, estados vazios, gráfico operacional e botões continuam usando verdes literais e `--forest`.
- `frontend/src/styles/global.css`: seleção e foco visível já usam o token vermelho `--dl-color-red`; validar contraste nos temas claro e escuro.
- `frontend/src/styles/session-state.css`: os estados gerais ainda usam alguns aliases legados; perfil e logout da sidebar já foram adaptados à superfície grafite.
- `frontend/src/styles/demo-login.css`: já contém superfícies grafite e acentos vermelhos, mas mantém várias cores literais; migrar esses valores para tokens também é necessário para consistência entre telas e temas.

A migração deverá trocar um grupo visual por vez e verificar os dois temas, evitando reescrever os dashboards ou alterar contraste e semântica de estados por substituição global de cores.