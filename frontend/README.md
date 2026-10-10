# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Frontend Portal Analítico

  Aplicação React com TypeScript, Vite e ESLint. A estrutura inicial inclui navegação entre Visão Geral, Comercial e Operacional, cliente HTTP compartilhado e indicador de conexão com a API FastAPI.

  ## Requisitos

  - Node.js 20.19+ (ou 22.12+)
  - npm

  ## Instalação e configuração

  Na pasta `frontend/`:

  ```powershell
  npm install
  Copy-Item .env.example .env
  ```

  O `.env` pode manter `VITE_API_BASE_URL=http://localhost:8000` para desenvolvimento local.

  ## Desenvolvimento

  ```powershell
  npm run dev
  ```

  ## Verificações e build

  ```powershell
  npm run lint
  npm run build
  npm run preview
  ```

  O modo Demo do backend não depende de Google Cloud ou BigQuery. O frontend apenas verifica `/health`; os dashboards e a autenticação não fazem parte desta fundação.
  globalIgnores(['dist']),
