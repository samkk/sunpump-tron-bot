# Sunpump Tron Sniper bot
This bot is your ultimate tool for identifying and trading tokens with the highest potential on the TRON blockchain. It's user-friendly, highly configurable, and packed with essential features to supercharge your trading experience! 🚀

## ✨ Features

- 🔔 **Liquidity Monitoring**: Keep a close eye on newly created liquidity pairs on SunSwap and get notified instantly.
- ⚡ **Automated Token Trading**: Execute buy and sell orders seamlessly as soon as liquidity is detected.
- 📊 **Advanced Analytics**: Analyze token data, including liquidity, price trends, and volume, to make informed decisions.
- 💬 **Telegram Bot Integration**: Manage and monitor your bot in real time via a sleek Telegram interface.
- 🔒 **Secure MongoDB Storage**: Your data is stored securely and reliably using MongoDB.

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Novacode-ux/sunpump-tron-sniper-bot
cd sunpump-tron-sniper-bot
```

2. Install the dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Ensure your MongoDB server is running. You can start it with the following command:

   ```bash
   mongod
   ```

4. Open the `.env` file in the root directory of your project and modify it with your specific configuration.

5. Start the bot:

   ```bash
   npm start
   # or
   yarn start
   ```

The bot will now start and connect to Telegram, MongoDB, and the TRON network.

### Available Commands

- `/start`: Initializes the bot and provides a welcome message.
- `/wallets`: Displays all wallets associated with your account.
- `/positions`: Shows your current token positions.
- `/pendingsnipes`: Lists all your pending sniping operations.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Contributions

Contributions are welcome! If you have ideas for improvements or new features, feel free to fork the repository and submit a pull request.
