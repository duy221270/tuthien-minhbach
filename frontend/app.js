let currentAccount = null;

window.addEventListener("DOMContentLoaded", () => {
    const connectBtn = document.getElementById("connectBtn");
    const walletAddress = document.getElementById("walletAddress");
    const donateBtn = document.getElementById("donateBtn");
    const status = document.getElementById("status");

    // --- KẾT NỐI METAMASK ---
    connectBtn.onclick = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await ethereum.request({ method: "eth_requestAccounts" });
                currentAccount = accounts[0];
                walletAddress.textContent = `Ví: ${currentAccount}`;
            } catch (error) {
                alert("Bạn chưa cho phép kết nối MetaMask!");
            }
        } else {
            alert("Bạn chưa cài MetaMask!");
        }
    };

    // --- DONATE ETH QUA Ethers.js ---
    donateBtn.onclick = async () => {
        const ethAmount = document.getElementById("amount").value;

        if (!currentAccount) {
            status.textContent = "⚠ Vui lòng kết nối ví!";
            return;
        }
        if (!ethAmount || ethAmount <= 0) {
            status.textContent = "⚠ Nhập số ETH hợp lệ!";
            return;
        }

        try {
            // Provider Ethers.js
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Lấy người ký giao dịch (signer)
            const signer = await provider.getSigner();

            // ĐỊA CHỈ VÍ NHẬN TIỀN TỪ THIỆN
            const toAddress = "0x0000000000000000000000000000000000000000"; 
            // ⚠ Bạn thay địa chỉ ví nhận tiền vào đây

            // Tạo giao dịch
            const tx = await signer.sendTransaction({
                to: toAddress,
                value: ethers.parseEther(ethAmount)
            });

            status.textContent = " Donate thành công! TX Hash: " + tx.hash;

        } catch (err) {
            console.log(err);
            status.textContent = " Lỗi khi gửi donate!";
        }
    };
});
