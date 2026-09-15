# Implantação: GitHub e Vercel

Status: aplicativo local validado; adaptação para a Vercel ainda pendente. Não importar a versão local como se já fosse uma aplicação de produção compatível.

## Repositório

Repositório sugerido: `dentec-calendarios`, privado, na conta escolhida pela responsável. Versionar código, testes e documentação. Excluir banco, PDFs enviados, configurações secretas e logs. Os testes serão executados pelo GitHub Actions em cada envio e pull request.

## Adaptações necessárias antes de publicar

1. Persistência: substituir o arquivo JSON local por banco transacional externo. As leituras devem ver alterações de outras instâncias; atualizações devem manter as verificações de versão e o isolamento por campus. Não usar `/tmp` como banco permanente.
2. Arquivos: guardar PDFs em armazenamento privado com autorização no download. O upload atual de até 8 MB em JSON/base64 precisa ser substituído por envio direto autorizado ou mecanismo compatível com os limites da plataforma. Não tornar documentos públicos para contornar o limite de upload.
3. Autenticação: persistir sessões, limites de tentativas e estados temporários de autenticação em serviço compartilhado. O primeiro ADMIN precisa de segredo de instalação protegido. Manter convites de uso único, expiração, autenticação e autorização no servidor.
4. Servidor: disponibilizar o manipulador HTTP como função, configurar roteamento dos arquivos do aplicativo e validar a origem pública HTTPS. Não depender de porta local ou de processo permanentemente ativo.
5. PDF: preparar renderizador compatível com a hospedagem, preservando logo, cores e layout PROENS. O Chrome instalado no Windows não existe na Vercel.
6. Dados existentes: planejar importação protegida separada do GitHub, após escolha do banco e armazenamento. Não enviar `data/database.json` ao repositório.
7. Validação de publicação: verificar login, convites, separação de campi, revisão concorrente, upload/download, PDF e persistência entre duas publicações. Configurar backup e testar restauração antes do uso institucional.

A Vercel hospeda o aplicativo; o banco e os arquivos persistentes precisam de serviços associados. A escolha de serviços, contas, regiões e planos deve ser definida antes de configurar credenciais ou contratar recursos.

Referências oficiais consultadas:
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/storage
