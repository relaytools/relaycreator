FROM node:18-buster

WORKDIR /app

# fyi todo, lnbits types update for CheckInvoice.paid
# manual modification made to lnbits for paid option (using build system node_modules)

COPY . .
RUN npm i
RUN npm run build

CMD ["npm", "start"]
