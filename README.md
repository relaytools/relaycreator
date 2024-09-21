This is the relay creator for #nostr app repository.

## Getting Started

First, copy and configure the example .env:
The required settings right now are mysql and lnbits.
The rest can be left as default.

```bash
cp env.develop .env
```

You'll need to install using `pnpm` due to github dependencies:

```bash
sudo npm install -g pnpm # if you don't have pnpm
pnpm install
```

Next, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## TODO:
There is much to do, I know.  If you're interested in helping with the project let me know!

- [ ] Create a docker-compose setup for easy development
- [x] Make development possible w/out LNBITS
- [ ] Add more documentation
- [ ] UI tweaks for responsive/mobile
- [ ] Login via mobile DM
- [x] Fix flicker on theme switch
- [x] Relay directory and advertisement
- [ ] ...
