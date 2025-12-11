let currentAccount = null;
// ĐỊA CHỈ CONTRACT CỦA BẠN (Đã cập nhật đúng địa chỉ bạn gửi)
const contractAddress = "0x23EBfE34AFbc03548a7e3CE287F3E313c17C57c8";

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
    
    // [MỚI] Lấy thẻ hiển thị số dư
    const fundBalance = document.getElementById("fundBalance"); 
    const btnCheckBalance = document.getElementById("btnCheckBalance");

    // --- 1. KẾT NỐI VÍ ---
    connectBtn.onclick = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                currentAccount = accounts[0];
                walletAddress.innerText = `Ví: ${currentAccount.substring(0, 6)}...${currentAccount.slice(-4)}`;
                
                await checkAdmin(); 
                await getHistory(); 
                await getFundBalance(); // [MỚI] Lấy số dư ngay khi kết nối
                
            } catch (error) {
                console.error(error);
            }
        } else {
            alert("Cài MetaMask đi bạn!");
        }
    };

    // --- [QUAN TRỌNG] HÀM CẬP NHẬT SỐ DƯ QUỸ (Code bị thiếu lúc nãy) ---
    async function getFundBalance() {
        try {
            // Dùng provider để đọc dữ liệu blockchain
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Lấy số dư của Contract
            const balanceWei = await provider.getBalance(contractAddress);
            const balanceEth = ethers.formatEther(balanceWei);
            
            // Hiển thị lên web
            if (fundBalance) {
                fundBalance.innerText = balanceEth;
            }
            console.log("Đã cập nhật số dư:", balanceEth);
        } catch (err) {
            console.error("Lỗi lấy số dư:", err);
        }
    }

    // Nếu có nút "Cập nhật" thì gán sự kiện click cho nó
    if (btnCheckBalance) {
        btnCheckBalance.onclick = getFundBalance;
    }

    // --- 2. HÀM CHECK ADMIN ---
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

    // --- 3. HÀM LẤY LỊCH SỬ ---
    async function getHistory() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            const filter = contract.filters.DonationReceived();
            const events = await contract.queryFilter(filter);
            
            historyBody.innerHTML = "";
            events.reverse().forEach(event => {
                const donor = event.args[0];
                const amount = ethers.formatEther(event.args[1]);
                const shortDonor = `${donor.substring(0, 6)}...${donor.slice(-4)}`;
                
                const row = `<tr>
                    <td>${shortDonor}</td>
                    <td style="color: #4CAF50; font-weight:bold;">+${amount} ETH</td>
                </tr>`;
                historyBody.innerHTML += row;
            });
        } catch (err) {
            console.error("Lỗi tải lịch sử:", err);
            historyBody.innerHTML = "<tr><td colspan='2'>Chưa có dữ liệu</td></tr>";
        }
    }

    // --- 4. DONATE ---
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

            status.innerText = "🎉 Thành công!";
            
            // [MỚI] Cập nhật lại mọi thứ sau khi donate xong
            await getHistory(); 
            await getFundBalance(); 
            
        } catch (err) {
            console.error(err);
            status.innerText = "❌ Lỗi: " + err.message;
        }
    };

    // --- 5. RÚT TIỀN ---
    btnWithdraw.onclick = async () => {
        const amount = document.getElementById("withdrawAmount").value;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.withdraw(ethers.parseEther(amount));
            await tx.wait();
            
            alert("Rút tiền thành công!");
            
            // [MỚI] Cập nhật lại số dư sau khi rút
            await getFundBalance();
            
        } catch (err) {
            alert("Lỗi rút tiền!");
        }
    };

    // Gọi hàm lấy số dư ngay khi trang vừa tải xong (để hiển thị luôn nếu mạng nhanh)
    getFundBalance();
});