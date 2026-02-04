let currentAccount = null;
// ĐỊA CHỈ CONTRACT CỦA BẠN (Giữ nguyên)
const contractAddress = "0x6BB86B55cE3B2AEC79a3deFDE2183fc2Bf19a522";

const abi = [
    "function donate() public payable",
    "function withdraw(uint amount) public",
    "function getBalance() public view returns (uint)",
    "function owner() public view returns (address)",
    "event DonationReceived(address indexed donor, uint amount)",
    "event Withdraw(address indexed admin, uint amount)"
];

window.addEventListener("DOMContentLoaded", async () => {
    const connectBtn = document.getElementById("connectBtn");
    const walletAddress = document.getElementById("walletAddress");
    const donateBtn = document.getElementById("donateBtn");
    const btnWithdraw = document.getElementById("btnWithdraw");
    const status = document.getElementById("status");
    const historyBody = document.getElementById("historyBody");
    const adminPanel = document.querySelector(".card-admin");
    const fundBalance = document.getElementById("fundBalance"); 
    const btnCheckBalance = document.getElementById("btnCheckBalance");

    // --- 1. KẾT NỐI VÍ ---
    connectBtn.onclick = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                currentAccount = accounts[0];
                walletAddress.innerText = `Ví: ${currentAccount}`; // Hiện full địa chỉ
                
                await checkAdmin(); 
                await getHistory(); 
                await getFundBalance();
                
            } catch (error) {
                console.error(error);
            }
        } else {
            alert("Cài MetaMask đi bạn!");
        }
    };

    // --- HÀM CẬP NHẬT SỐ DƯ QUỸ ---
    async function getFundBalance() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balanceWei = await provider.getBalance(contractAddress);
            const balanceEth = ethers.formatEther(balanceWei);
            if (fundBalance) fundBalance.innerText = balanceEth;
        } catch (err) {
            console.error("Lỗi lấy số dư:", err);
        }
    }
    if (btnCheckBalance) btnCheckBalance.onclick = getFundBalance;

    // --- HÀM CHECK ADMIN ---
    async function checkAdmin() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            const ownerAddress = await contract.owner();
            
            if (currentAccount.toLowerCase() === ownerAddress.toLowerCase()) {
                adminPanel.style.display = "block";
            } else {
                adminPanel.style.display = "none";
            }
        } catch (err) {
            console.error("Lỗi check admin:", err);
        }
    }

    // --- [NÂNG CẤP] HÀM LẤY LỊCH SỬ (CẢ THU VÀ CHI) ---
    async function getHistory() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            
            // 1. Lấy danh sách người Donate
            const filterDonate = contract.filters.DonationReceived();
            const eventsDonate = await contract.queryFilter(filterDonate);

            // 2. Lấy danh sách Admin rút tiền
            const filterWithdraw = contract.filters.Withdraw();
            const eventsWithdraw = await contract.queryFilter(filterWithdraw);

            // 3. Gộp 2 danh sách lại
            let allEvents = [];

            // Xử lý sự kiện Donate
            eventsDonate.forEach(event => {
                allEvents.push({
                    type: 'donate', // Đánh dấu là Nạp
                    address: event.args[0],
                    amount: ethers.formatEther(event.args[1]),
                    block: event.blockNumber
                });
            });

            // Xử lý sự kiện Rút tiền
            eventsWithdraw.forEach(event => {
                allEvents.push({
                    type: 'withdraw', // Đánh dấu là Rút
                    address: event.args[0],
                    amount: ethers.formatEther(event.args[1]),
                    block: event.blockNumber
                });
            });

            // 4. Sắp xếp theo thời gian (Block lớn hơn là mới hơn)
            allEvents.sort((a, b) => b.block - a.block);

            // 5. Hiển thị ra bảng
            historyBody.innerHTML = ""; 
            
            allEvents.forEach(item => {
                let row = "";
                const shortAddr = `${item.address.substring(0, 6)}...${item.address.slice(-4)}`;

                if (item.type === 'donate') {
                    // Dòng màu XANH (Cộng tiền)
                    row = `<tr>
                        <td>👤 ${shortAddr}</td>
                        <td style="color: #2ecc71; font-weight:bold;">+${item.amount} ETH</td>
                    </tr>`;
                } else {
                    // Dòng màu ĐỎ (Trừ tiền)
                    row = `<tr>
                        <td>👮‍♂️ <span style="color:red; font-weight:bold;">ADMIN RÚT</span></td>
                        <td style="color: #e74c3c; font-weight:bold;">-${item.amount} ETH</td>
                    </tr>`;
                }
                historyBody.innerHTML += row;
            });
            
        } catch (err) {
            console.error("Lỗi tải lịch sử:", err);
            historyBody.innerHTML = "<tr><td colspan='2'>Chưa có dữ liệu</td></tr>";
        }
    }

    // --- DONATE ---
    donateBtn.onclick = async () => {
        const amount = document.getElementById("amount").value;
        if (!currentAccount) return alert("Kết nối ví trước!");
        try {
            status.innerText = "⏳ Đang xử lý...";
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.donate({ value: ethers.parseEther(amount) });
            await tx.wait();

            status.innerText = "🎉 Donate thành công!";
            await getHistory(); 
            await getFundBalance(); 
        } catch (err) {
            status.innerText = "❌ Lỗi: " + err.message;
        }
    };

    // --- RÚT TIỀN ---
    btnWithdraw.onclick = async () => {
        const amount = document.getElementById("withdrawAmount").value;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.withdraw(ethers.parseEther(amount));
            await tx.wait();
            
            alert("Rút tiền thành công!");
            await getHistory(); // Cập nhật ngay dòng màu đỏ vào bảng
            await getFundBalance();
        } catch (err) {
            alert("Lỗi rút tiền!");
        }
    };

    // Chạy lần đầu
    getFundBalance();
});