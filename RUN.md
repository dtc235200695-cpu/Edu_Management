# Hướng dẫn chạy dự án Learnwise (DTDM)

## Run

### Chạy lần đầu

Mở PowerShell tại thư mục dự án:

``` powershell
Set-Location C:\xampp\htdocs\DTDM
npm install
```

Lệnh `npm install` cài đặt các thư viện cần thiết được khai báo trong dự
án.

### Terminal 1 --- Backend

Mở Terminal thứ nhất:

``` powershell
Set-Location C:\xampp\htdocs\DTDM
npm run server
```

Giữ Terminal này mở trong suốt quá trình chạy Backend.

### Terminal 2 --- Frontend

Mở Terminal thứ hai:

``` powershell
Set-Location C:\xampp\htdocs\DTDM
npm run dev
```

Giữ Terminal này mở trong suốt quá trình chạy Frontend. Truy cập địa chỉ
mà Vite hiển thị trong Terminal bằng trình duyệt.

### Chạy bản build thay cho chế độ dev (tùy chọn)

Tại thư mục gốc dự án:

``` powershell
Set-Location C:\xampp\htdocs\DTDM
npm run build
npm start
```

## Tải code mới nhất của nhóm từ GitHub

Khi một thành viên trong nhóm đã sửa code, commit và push lên GitHub,
các thành viên còn lại thực hiện các bước dưới đây để tải phiên bản mới
về máy.

### Bước 1 --- Mở thư mục dự án

``` powershell
Set-Location C:\xampp\htdocs\DTDM
```

Nếu dự án nằm ở thư mục khác, thay đường dẫn trên bằng đường dẫn thực
tế.

### Bước 2 --- Kiểm tra thay đổi đang có trên máy

``` powershell
git status
```

Nếu có file đang chỉnh sửa hoặc chưa commit, hãy commit hoặc sao lưu các
thay đổi cần giữ trước khi cập nhật. Không chạy `git reset --hard` tùy
tiện vì có thể làm mất code.

### Bước 3 --- Chuyển sang nhánh main

``` powershell
git switch main
```

Nếu nhóm đang sử dụng một nhánh chung khác, thay `main` bằng tên nhánh
đó.

### Bước 4 --- Lấy thông tin mới nhất từ GitHub

``` powershell
git fetch origin
```

### Bước 5 --- Tải code mới nhất

``` powershell
git pull origin main
```

Lệnh này cập nhật các commit đã được push lên nhánh `main` của
repository GitHub về máy tính.

### Bước 6 --- Cập nhật thư viện nếu cần

``` powershell
npm install
```

Nên chạy lệnh này nếu có thay đổi trong `package.json` hoặc
`package-lock.json`, hoặc nếu dự án báo thiếu thư viện.

### Bước 7 --- Kiểm tra phiên bản vừa tải

``` powershell
git log -5 --oneline
git status
```

Kiểm tra commit mới nhất và trạng thái làm việc của Git. Nếu nhánh đã
đồng bộ với `origin/main` và không còn thay đổi cục bộ cần xử lý, quá
trình cập nhật đã hoàn tất.

## Quy trình cập nhật nhanh

Sau khi thành viên khác đã push code lên nhánh `main`, thành viên cần
cập nhật có thể chạy:

``` powershell
Set-Location C:\xampp\htdocs\DTDM
git status
git switch main
git pull origin main
npm install
```

Chỉ chạy `git pull` sau khi commit của thành viên khác đã được push lên
GitHub và có trên nhánh `main`.

## Lưu ý khi làm việc nhóm

-   Thành viên sửa code cần `git add`, `git commit` và `git push` để đưa
    thay đổi lên GitHub.
-   Các thành viên khác chỉ tải được commit sau khi commit đó đã được
    push lên GitHub.
-   Kiểm tra `git status` trước khi pull để tránh ghi đè hoặc gây xung
    đột với thay đổi đang làm trên máy.
-   Nếu Git báo xung đột (merge conflict), cần xử lý các file được thông
    báo trước khi tiếp tục.
-   `git pull` chỉ cập nhật mã nguồn; không tự động cập nhật dữ liệu
    database, cấu hình Cloudflare hoặc các biến môi trường bí mật.
-   Không đưa file `.env` chứa mật khẩu, API key hoặc thông tin bí mật
    lên GitHub.
-   Nếu Backend và Frontend đang chạy, nhấn `Ctrl + C` trong từng
    Terminal để dừng trước khi cập nhật lớn; sau đó khởi động lại theo
    hướng dẫn ở phần Run.

## Các lệnh thường dùng

``` powershell
# Vào thư mục dự án
Set-Location C:\xampp\htdocs\DTDM

# Cài thư viện
npm install

# Chạy Backend
npm run server

# Chạy Frontend
npm run dev

# Cập nhật code từ GitHub
git status
git switch main
git fetch origin
git pull origin main
npm install

# Kiểm tra commit gần nhất
git log -5 --oneline
```
