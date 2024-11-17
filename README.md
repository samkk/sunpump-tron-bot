# 🌟 SunPump TRON Sniper Bot

![TRANCHESBOT-BANNER](https://github.com/user-attachments/assets/0f4e8f1a-e4f3-46b4-8259-ab89dc2fc8ed)

Your ultimate tool for identifying and trading high-potential tokens on the TRON blockchain! 🎯 Easy to use, highly configurable, and loaded with powerful features to elevate your trading game.

## ✨ Features

- 🔔 **Liquidity Monitoring**: Keep a close eye on newly created liquidity pairs on SunSwap and get notified instantly.
- ⚡ **Automated Token Trading**: Execute buy and sell orders seamlessly as soon as liquidity is detected.
- 📊 **Advanced Analytics**: Analyze token data, including liquidity, price trends, and volume, to make informed decisions.
- 🧰 **Rug Check**: Automatically perform a rug check on tokens to ensure they are safe to trade before executing any transactions.
- 💬 **Telegram Bot Integration**: Manage and monitor your bot in real time via a sleek Telegram interface.
- 🔒 **Secure MongoDB Storage**: Your data is stored securely and reliably using MongoDB.
- 🧪 **Transaction Simulation**: Simulate token transactions to test the process before making real purchases.
- 🏷️ **Token Selection**: Automatically select tokens with high potential, including checking their liquidity and other factors before placing any orders.

## 🖼️ Screenshots
![image](https://github.com/user-attachments/assets/0a13ef16-9350-4a41-add2-4bc596ff7603)

## 🛠️ Prerequisites
Ensure your system is set up with the following:
- **Node.js** (v16 or higher)
- **npm or yarn**

## Getting Started

### 📥 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Novacode-ux/sunpump-tron-sniper-bot
   cd sunpump-tron-sniper-bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start MongoDB**:
   Ensure your MongoDB server is running. You can launch it using:
   ```bash
   mongod
   ```

4. **Configure the Bot**:
   Open the `.env` file in the project’s root directory and update it with your custom settings (e.g., Telegram API token, MongoDB URI, TRON wallet details).

5. Start the bot:
   ```bash
   npm start
   # or
   yarn start
   ```

🎉 That’s it! Your bot is now connected to Telegram, MongoDB, and the TRON network.

### Available Commands
- 🟢 `/start`: Kick things off with a welcome message and initialize the bot.
- 👜 `/wallets`: Display all wallets associated with your account.
- 📈 `/positions`: View your current token positions and performance.
- 🕒 `/pendingsnipes`: Check the status of all your pending sniping operations.
  
## 📜 License
This project is licensed under the MIT License. For details, check the [LICENSE](LICENSE) file.

## ☕ Contributions
Contributions are welcome! If you have ideas for improvements or new features, feel free to fork the repository and submit a pull request.
