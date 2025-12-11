let currentAccount = null;
// ĐỊA CHỈ CONTRACT CỦA BẠN (Giữ nguyên cái cũ của bạn)
const contractAddress = "0x23EBfE34AFbc03548a7e3CE287F3E313c17C57c8";

// ABI đầy đủ để đọc Event và Owner
const abi = [
    "function donate() public payable",
    "function withdraw(uint amount) public",
    "function getBalance() public view returns (uint)",
    "function owner() public view returns (address)", // Hàm xem ai là chủ
    "event DonationReceived(address indexed donor, uint amount)", // Sự kiện
    "event Withdraw(address indexed admin, uint amount)"
];

window.addEventListener("DOMContentLoaded", async () => {
    const connectBtn = document.getElementById("connectBtn");
    const walletAddress = document.getElementById("walletAddress");
    const donateBtn = document.getElementById("donateBtn");
    const btnWithdraw = document.getElementById("btnWithdraw");
    const status = document.getElementById("status");
    const historyBody = document.getElementById("historyBody");
    const adminPanel = document.querySelector(".card-admin"); // Lấy thẻ Admin

    // --- 1. KẾT NỐI VÍ & KIỂM TRA ADMIN ---
    connectBtn.onclick = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                currentAccount = accounts[0];
                walletAddress.innerText = `Ví: ${currentAccount.substring(0, 6)}...${currentAccount.slice(-4)}`;
                
                await checkAdmin(); // Kiểm tra xem ví này có phải chủ không
                await getHistory(); // Tải lịch sử ngay khi kết nối
                
            } catch (error) {
                console.error(error);
            }
        } else {
            alert("Cài MetaMask đi bạn!");
        }
    };

    // --- 2. HÀM KIỂM TRA QUYỀN ADMIN (An toàn) ---
    async function checkAdmin() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            
            const ownerAddress = await contract.owner();
            
            // So sánh ví đang kết nối với ví chủ contract (chuyển về chữ thường để so sánh chính xác)
            if (currentAccount.toLowerCase() === ownerAddress.toLowerCase()) {
                adminPanel.style.display = "block"; // Hiện bảng Admin
                console.log("Chào mừng Admin quay lại!");
            } else {
                adminPanel.style.display = "none"; // Ẩn đi nếu là khách
            }
        } catch (err) {
            console.error("Lỗi check admin:", err);
        }
    }

    // --- 3. HÀM LẤY LỊCH SỬ (Minh bạch) ---
    async function getHistory() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(contractAddress, abi, provider);
            
            // Lấy toàn bộ sự kiện DonationReceived từ quá khứ đến nay
            const filter = contract.filters.DonationReceived();
            const events = await contract.queryFilter(filter);
            
            historyBody.innerHTML = ""; // Xóa dòng "Đang tải..."
            
            // Duyệt ngược từ mới nhất về cũ nhất
            events.reverse().forEach(event => {
                const donor = event.args[0];
                const amount = ethers.formatEther(event.args[1]);
                
                // Cắt ngắn địa chỉ cho đẹp
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

    // --- 4. CHỨC NĂNG DONATE ---
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
            getHistory(); // Tải lại bảng lịch sử ngay lập tức
            
        } catch (err) {
            console.error(err);
            status.innerText = "❌ Lỗi: " + err.message;
        }
    };

    // --- 5. CHỨC NĂNG RÚT TIỀN ---
    btnWithdraw.onclick = async () => {
        const amount = document.getElementById("withdrawAmount").value;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);

            const tx = await contract.withdraw(ethers.parseEther(amount));
            await tx.wait();
            alert("Rút tiền thành công!");
        } catch (err) {
            alert("Lỗi rút tiền!");
        }
    };
});