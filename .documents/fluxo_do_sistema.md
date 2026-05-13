Fluxo de trabalho do sistema de agendamento.

App será dividido em 2 roles

----------------------
A. Role Cliente (index.html)

A1. Cliente acessa o app através de um link que foi compartilhado pela manicure.
A2. Ao acessar o link o cliente se depara com uma tela de boas vindas com principais informacões do salão.
A3. A tela de boas vindas terá logotipo do salão, dados de contato, área para avisos (variavel conforme gravado pelo ADMIN em sua role)
A4. Nesta tela também temos um botão para agendamentos, quando clicado direciona para o início do fluxo de agendamento.
A5. O fluxo de agendamento se dá da seguinte forma:
    A5.1 - Cliente escolhe na lista de procedimentos (criado na role admin) qual atendimento deseja.
    A5.2 - Cliente escolhe a data do agendamento
    A5.3 - Cliente escolhe o horário de agendamento
    A5.4 - Preenche seus dados (Nome e Telefone)
    A5.5 - É direcionado para a tela de confirmação
    A5.6 - O App envia uma mensagem com autorizaçao do cliente através do Whatsapp com a mensagem de confirmação de agendamento.
    A5.7 - Agendamento Feito! Tanto o cliente como o admnistrador tem uma msg salva nos seus respectivos Whatsapps. 

Regras de Agendamento:

1. O cliente deve escolher um procedimento (obrigatório)
2. O cliente deve escolher um dia que não seja Domingo
3. O cliente deve escolher um horário disponível (obrigatóri)
4. O sistema deve verificar quais os horários disponiveis, considerando pelo que foi cadastrado pelo ADMIN na ROLE ADM
5. O sistema deve considerar o tempo de cada atendimento cadastrado na lista de procedimentos que o ADMIN cadastrou com seus respectivos tempos. Sendo assim se um procedimento tem por exemplo: 60 minutos o sistema deve bloquear a possibilidade de agendamento considerando um horario já agendado + o tempo de procedimendo deste procedimento agendado.
6. O sistema deve considerar o tempo de procedimento para horários próximos ao fim do expediente, conforme definido pelo ADM.
7. O sistema deve considerar na mesma lógica para horários bloqueados (criado pelo ADM).

----------------------
B. Role Administrador (admin.html)

B1. Administrador loga no seu role com usuário e senha (cadastrados através do banco de Dados Firebase)
B2. Tela inicial para o admim será uma agenda com calendário na parte superior e lista dos agendamentos do dia na parte inferior que são ativados conforme for clicando nas datas desejadas.

Configuraçõs do ADM

1. Adm terá uma tela para criar, editar e excluir procedimentos que ele atende.
2. ADM terá uma tela para configurar seus horarios de trabalho, dias de folga e horarios que deseja bloquear.
3. ADM terá uma tela para cadastrar, editar e excluir clientes.
4. ADM terá uma tela para configurar informações do salão.
5. Todas as telas serão navegadas através de um menu lateral estilo Hamburger com icones e nome de cada recurso.
