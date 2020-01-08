FROM debian:buster
RUN apt update && apt install -y postfix dovecot-imapd
COPY dovecot /etc
EXPOSE 143 465
CMD ["/usr/bin/supervisord"]
