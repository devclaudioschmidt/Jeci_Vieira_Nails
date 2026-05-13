# Skill de Desenvolvimento WebApp - Guia de Boas Práticas e Arquitetura

Este documento consolida as diretrizes para o desenvolvimento de WebApps focados em performance, responsividade mobile-first e código limpo (Lean Code), utilizando exclusivamente tecnologias nativas e integração moderna com Firebase.

## 1. Stack e Filosofia de Desenvolvimento
* **Core:** HTML5, CSS3 e JavaScript (ES6+) puros (Vanilla).
* **Filosofia Lean Code:** Código enxuto, sem frameworks desnecessários, priorizando a velocidade de carregamento (LCP < 1s).
* **Mobile-First:** O desenvolvimento começa obrigatoriamente pela menor tela e escala para desktop.
* **Manutenibilidade:** Todo código deve ser documentado com comentários claros para facilitar futuras atualizações.

## 2. Arquitetura de Pastas (Padrão)
A estrutura deve seguir rigorosamente esta organização para garantir modularidade:
```text
/meu-webapp
├── index.html                 <!-- Página inicial -->
├── /pages                     <!-- Outras páginas HTML -->
├── /assets                    <!-- Mídias (Imagens WebP/SVG) -->
├── /css                       <!-- Estilos Modulares -->
│   ├── global.css             <!-- Reset, Variáveis, Tipografia -->
│   └── /pages                 <!-- CSS específico por página -->
├── /js                        <!-- Lógica Modular -->
│   ├── global.js              <!-- Comportamentos globais -->
│   ├── /firebase              <!-- Configurações do SDK -->
│   └── /pages                 <!-- Lógica específica por página -->
```

## 3. Diretrizes de CSS
* **Separação de Escopo:** Utilizar `global.css` para o que é comum e arquivos específicos em `/css/pages/` para estilos únicos.
* **Proibição de CSS Inline:** Estilos dentro de tags HTML são proibidos. Caso necessário por performance extrema, deve haver consulta prévia.
* **Design System:** Uso de Variáveis CSS (Custom Properties) para cores, fontes e espaçamentos, garantindo consistência visual.
* **Metodologia:** Sugere-se o uso de BEM ou similares para manter a especificidade controlada.
* **Código Limpo (Lean Code):** Remoção de código desnecessário, simplificação de funções e eliminação de redundâncias para melhorar a legibilidade e performance.
* **Comentários em Português:** Todos os comentários no código devem estar em português.
* **Nomes de Arquivos e Funções:** Devem seguir o padrão inglês para melhor compatibilidade com ferramentas e facilitar a colaboração futura, mesmo que os comentários e textos da interface estejam em português.


## 4. Integração Firebase (SDK v9+ Modular)
* **Tree-shaking:** Importar apenas as funções necessárias de cada módulo para reduzir o bundle.
* **Modelagem de Dados:** Estrutura "Flat" (plana). Dados que crescem devem estar em subcoleções para não exceder o limite de 1 MiB por documento.
* **Otimização de Leituras:** Uso obrigatório de `.limit()` e paginação em listas.
* **Segurança:** Implementação de `Firebase Security Rules` baseadas em `request.auth.uid`. Nunca utilizar modo de teste em produção.
* **App Check:** Ativação obrigatória para proteger contra acessos não autorizados de scripts maliciosos.

## 5. Princípios de UI/UX
* **Minimalismo:** Remover elementos que não agregam valor.
* **Espaço em Branco (White Space):** Uso estratégico para melhorar a legibilidade e sensação premium.
* **Feedback de Interface:** Microinterações em CSS para responder a cliques e estados de carregamento (Loaders/Skeletons) enquanto o Firebase processa dados.
* **Acessibilidade:** HTML semântico, contraste adequado e navegabilidade total por teclado.

## 6. Governança e Controle
* **Comando do Desenvolvedor:** A IA atua como parceiro intelectual imparcial. Nenhuma decisão estrutural ou de código é tomada sem autorização explícita.
* **Fluxo de Trabalho:** A IA deve sempre perguntar qual caminho seguir antes de cada etapa.
* **Gestão de Repositório (Git/GitHub):** Proibido realizar commits ou pushes sem permissão prévia.

---
*Documento gerado para aplicação em ambiente de desenvolvimento (IDE).*