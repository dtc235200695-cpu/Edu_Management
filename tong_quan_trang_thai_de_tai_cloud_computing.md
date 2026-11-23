# Tổng quan trạng thái đề tài Cloud Computing

**Tên đề tài:** Phân tích dữ liệu học tập và ứng dụng Machine Learning
trong dự đoán kết quả, cá nhân hóa lộ trình học tập\
**Trạng thái:** Đang ở giai đoạn xác định yêu cầu và thiết kế tổng thể;
chưa bắt đầu triển khai chính thức.

------------------------------------------------------------------------

## 1. Mục tiêu tổng quát

Xây dựng một hệ thống có khả năng thu thập và quản lý dữ liệu học tập,
phân tích quá trình học, sử dụng Machine Learning (ML) để dự đoán kết
quả học tập, sau đó hỗ trợ cá nhân hóa lộ trình học cho từng người học.

Hệ thống dự kiến gồm bốn nhóm chức năng chính:

1.  **Quản lý dữ liệu học tập:** lưu thông tin người học, khóa học, bài
    học, tiến độ, hoạt động và kết quả kiểm tra.
2.  **Phân tích học tập:** thống kê tiến độ, thời gian học, kết quả,
    điểm mạnh và điểm yếu.
3.  **Dự đoán bằng Machine Learning:** sử dụng dữ liệu đã thu thập để dự
    đoán một hoặc nhiều kết quả học tập.
4.  **Cá nhân hóa lộ trình:** dựa trên kết quả phân tích và dự đoán để
    đề xuất nội dung hoặc thứ tự học phù hợp.

Đây là định hướng nghiệp vụ hiện tại, chưa phải danh sách chức năng cuối
cùng.

## 2. Định hướng công nghệ đã thống nhất

  -----------------------------------------------------------------------
  Thành phần              Công nghệ/giải pháp     Trạng thái
  ----------------------- ----------------------- -----------------------
  Frontend                ReactJS, định hướng     Đã chọn định hướng
                          dùng Vite

  Nền tảng triển khai     Cloudflare Workers      Đề xuất kiến trúc
  frontend                Static Assets

  Backend                 Python, ưu tiên FastAPI Đã chọn định hướng

  Nền tảng chạy backend   Python Workers trên     Đã chọn phương án, cần
                          Cloudflare              kiểm chứng

  Cơ sở dữ liệu SQL       Cloudflare D1 (SQLite)  Đã chọn

  Lưu trữ tệp             Cloudflare R2           Đã chọn định hướng

  Xử lý tác vụ nền        Cloudflare Queues       Tùy nhu cầu, chưa chốt

  Phát triển và triển     Wrangler                Đề xuất
  khai

  Trực quan hóa dữ liệu   Chart.js                Đề xuất

  Quản lý mã nguồn        Git/GitHub              Đề xuất

  ML và xử lý dữ liệu     Scikit-learn, Pandas,   Định hướng; cần kiểm
                          NumPy                   tra môi trường chạy
  -----------------------------------------------------------------------

Ưu tiên kiến trúc cloud-first và các dịch vụ Cloudflare. Không có yêu
cầu bắt buộc phải sử dụng máy chủ backend thuê bên ngoài.

## 3. Kiến trúc hệ thống dự kiến

Luồng xử lý tổng quát:

``` text
Người dùng
    |
    v
Cloudflare Edge
    |
    +--> ReactJS (giao diện web)
    |
    v
Python Worker / FastAPI (Backend API)
    |
    +--> D1: dữ liệu người dùng và dữ liệu học tập
    |
    +--> R2: dataset, tệp mô hình ML và báo cáo
    |
    +--> Queues: tác vụ nền (nếu cần)
    |
    v
Các module nghiệp vụ
    +--> Quản lý dữ liệu
    +--> Phân tích học tập
    +--> ML dự đoán
    +--> Đề xuất lộ trình học
```

Ở giai đoạn đầu, API và các chức năng ML có thể được tổ chức thành các
module trong cùng một ứng dụng Worker. Chỉ nên tách thành nhiều Worker
hoặc dịch vụ riêng khi có lý do rõ ràng về tải, giới hạn kỹ thuật hoặc
khả năng bảo trì.

**Lưu ý kỹ thuật quan trọng:** việc chạy Python trên Workers không đồng
nghĩa mọi thư viện Python đều tương thích. Một số thư viện như
Scikit-learn, NumPy hoặc các gói có native dependencies có thể không
chạy trực tiếp trong môi trường Python Workers/Pyodide. Cần làm
prototype để kiểm tra trước khi quyết định cách triển khai inference. Có
thể huấn luyện trong môi trường tương thích riêng, xuất mô hình sang
định dạng nhẹ rồi triển khai phần dự đoán tương thích với Workers.

## 4. Phạm vi Machine Learning dự kiến

### 4.1. Các bài toán có thể lựa chọn

-   Dự đoán điểm số của người học.
-   Dự đoán khả năng đậu/trượt một bài kiểm tra hoặc khóa học.
-   Dự đoán khả năng hoàn thành khóa học.
-   Phát hiện người học có nguy cơ học tập sa sút hoặc bỏ học.

Chưa quyết định bài toán nào sẽ là mục tiêu ML chính. Nên chọn một bài
toán chính và tối đa một bài toán phụ để phạm vi đồ án vừa sức, có thể
đánh giá được.

### 4.2. Thuật toán có thể cân nhắc

  -----------------------------------------------------------------------
  Bài toán                            Thuật toán tham khảo
  ----------------------------------- -----------------------------------
  Dự đoán điểm số (hồi quy)           Linear Regression, Decision Tree
                                      Regressor, Random Forest Regressor

  Phân loại đậu/trượt hoặc nguy cơ    Logistic Regression, Decision Tree,
                                      Random Forest

  Phân nhóm người học                 K-Means
  -----------------------------------------------------------------------

Không cần sử dụng tất cả thuật toán. Việc lựa chọn cần dựa trên loại dữ
liệu, mục tiêu dự đoán và khả năng giải thích kết quả.

### 4.3. Đánh giá mô hình

-   **Hồi quy:** MAE, MSE, RMSE, R².
-   **Phân loại:** Accuracy, Precision, Recall, F1-score.
-   **Phân cụm:** Silhouette Score.

Cần chia tập dữ liệu huấn luyện/kiểm thử phù hợp và tránh data leakage.
Ví dụ, nếu dự đoán điểm cuối kỳ thì không được dùng chính điểm cuối kỳ
làm dữ liệu đầu vào.

### 4.4. Cá nhân hóa lộ trình

Định hướng kết hợp hai cách:

-   ML phân tích hoặc dự đoán năng lực, xu hướng và nguy cơ học tập.
-   Rule-based chuyển kết quả thành các đề xuất có thể kiểm soát, chẳng
    hạn gợi ý ôn lại chủ đề yếu hoặc ưu tiên bài học phù hợp.

Cách kết hợp này giúp hệ thống dễ giải thích và dễ kiểm thử hơn so với
việc để mô hình tự quyết định toàn bộ lộ trình.

## 5. Dữ liệu

### 5.1. Nhóm dữ liệu dự kiến

-   Thông tin người học.
-   Khóa học và bài học.
-   Đăng ký khóa học.
-   Hoạt động học tập và thời gian học.
-   Tiến độ hoàn thành.
-   Lượt làm bài kiểm tra và kết quả.
-   Lịch sử dự đoán và đề xuất lộ trình.

### 5.2. Nguồn dữ liệu có thể tham khảo

-   UCI Student Performance.
-   Open University Learning Analytics Dataset (OULAD).
-   Dataset phù hợp trên Kaggle.
-   Dữ liệu được thu thập từ chính hệ thống.

Dữ liệu giả lập có thể hỗ trợ phát triển và kiểm thử ban đầu, nhưng
không nên tạo dữ liệu ngẫu nhiên hoàn toàn rồi dùng kết quả đó để khẳng
định mô hình có độ chính xác thực tế. Nếu sử dụng dữ liệu giả lập, cần
xác định quy luật tạo dữ liệu và trình bày rõ giới hạn.

## 6. Cơ sở dữ liệu D1 dự kiến

Các bảng đang được đề xuất, chưa phải schema đã chốt:

-   `users`
-   `roles`
-   `courses`
-   `lessons`
-   `enrollments`
-   `learning_activities`
-   `learning_progress`
-   `quiz_attempts`
-   `quiz_results`
-   `predictions`
-   `learning_paths`
-   `recommendations`
-   `ml_models`

Cloudflare D1 sử dụng SQLite, vì vậy thiết kế schema, kiểu dữ liệu, câu
lệnh SQL và migration phải tương thích SQLite. Cần xác định quan hệ và
dữ liệu thực sự cần lưu trước khi tạo database.

## 7. Cấu trúc mã nguồn tham khảo

``` text
learning-analytics/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── assets/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── analytics/
│   │   ├── machine_learning/
│   │   ├── recommendation/
│   │   └── storage/
│   ├── migrations/
│   ├── tests/
│   ├── pyproject.toml
│   └── wrangler.jsonc
├── ml-training/
│   ├── datasets/
│   ├── notebooks/
│   ├── preprocessing/
│   ├── training/
│   ├── evaluation/
│   └── exports/
├── docs/
└── README.md
```

Đây chỉ là cấu trúc tham khảo. Có thể điều chỉnh sau khi chốt quy trình
nghiệp vụ và cách triển khai mô hình.

## 8. Các quyết định đã có và các nội dung chưa chốt

### Đã thống nhất ở mức định hướng

-   Đề tài tập trung vào phân tích dữ liệu học tập, dự đoán kết quả và
    cá nhân hóa lộ trình.
-   Ưu tiên ReactJS cho frontend và Python cho backend.
-   Chọn Cloudflare D1 làm SQL database.
-   Chọn phương án ưu tiên Python chạy trên Cloudflare Workers, không
    thuê backend server bên ngoài.
-   Định hướng sử dụng Cloudflare R2 cho lưu trữ tệp.
-   Ưu tiên kiến trúc cloud-first.
-   Chưa bắt buộc dùng các dịch vụ như Workers AI, Vectorize, Durable
    Objects, Kubernetes hoặc kiến trúc microservices phức tạp.

### Chưa chốt về nghiệp vụ

1.  Đối tượng sử dụng: học sinh phổ thông, sinh viên, học viên trực
    tuyến hay nhiều nhóm đối tượng.
2.  Hình thức hệ thống:
    -   Có nền tảng học trực tuyến gồm khóa học, bài học và bài kiểm
        tra.
    -   Chỉ phân tích dữ liệu lấy từ một hệ thống học tập khác.
    -   Chỉ là hệ thống phân tích dữ liệu, không cung cấp chức năng học
        trực tuyến.
3.  Vai trò: học viên và quản trị viên; học viên, giáo viên và quản trị
    viên; hay thêm người nghiên cứu.
4.  Chức năng cụ thể và quyền hạn của từng vai trò.
5.  Quy trình ghi nhận hoạt động và thu thập dữ liệu học tập.

### Chưa chốt về Machine Learning

1.  Chọn đầu ra dự đoán chính.
2.  Chọn dataset và xác định các trường dữ liệu đầu vào.
3.  Chọn thuật toán và mô hình dùng để so sánh.
4.  Chọn metrics phù hợp với bài toán.
5.  Xác định quy tắc chuyển kết quả dự đoán thành lộ trình học.
6.  Xác định cách huấn luyện, lưu phiên bản và cập nhật mô hình.
7.  Kiểm chứng khả năng chạy inference trong Python Workers.

### Chưa chốt về Cloud và vận hành

1.  Schema D1, quan hệ bảng và chiến lược migration.
2.  Cấu trúc bucket và quy tắc lưu trữ trên R2.
3.  Có cần Queues hay không, và dùng cho tác vụ nào.
4.  Cơ chế đăng nhập, phân quyền, bảo vệ API và dữ liệu.
5.  Cấu hình môi trường development và production.
6.  Logging, monitoring và xử lý lỗi.
7.  Giới hạn, chi phí và cách triển khai thực tế trên Cloudflare.
8.  Prototype kiểm chứng frontend, backend Python và ML inference trên
    Cloudflare.

## 9. Lộ trình thực hiện đề xuất

  -----------------------------------------------------------------------
  Giai đoạn               Công việc               Kết quả cần có
  ----------------------- ----------------------- -----------------------
  1\. Chốt yêu cầu        Chọn đối tượng, hình    Tài liệu yêu cầu nghiệp
                          thức hệ thống, vai trò  vụ
                          và chức năng

  2\. Chốt bài toán ML    Chọn mục tiêu dự đoán,  Đặc tả bài toán ML
                          dataset, đầu vào, đầu
                          ra và metrics

  3\. Thiết kế hệ thống   Use case, luồng nghiệp  Tài liệu thiết kế
                          vụ, kiến trúc, ERD và
                          schema D1

  4\. Kiểm chứng công     Tạo prototype React,    Kết quả kiểm chứng khả
  nghệ                    Python Workers, D1, R2  thi
                          và thử thư viện ML

  5\. Xây dựng nền tảng   Làm frontend, API, xác  Hệ thống nền tảng
                          thực, dữ liệu và các
                          chức năng học tập/phân
                          tích

  6\. Xây dựng ML         Tiền xử lý, huấn luyện, Mô hình và báo cáo đánh
                          đánh giá và xuất mô     giá
                          hình

  7\. Tích hợp cá nhân    Tích hợp dự đoán với    Chức năng cá nhân hóa
  hóa                     quy tắc đề xuất lộ
                          trình

  8\. Triển khai và đánh  Deploy, kiểm thử, đo    Bản triển khai và báo
  giá                     hiệu năng, bảo mật và   cáo đồ án
                          hoàn thiện báo cáo
  -----------------------------------------------------------------------

## 10. Việc cần làm tiếp theo

Ưu tiên hiện tại là **chốt nghiệp vụ trước khi thiết kế database hoặc
viết code**.

Câu hỏi đầu tiên cần xác định là: hệ thống hướng đến nhóm người học nào?

-   Học sinh phổ thông.
-   Sinh viên đại học/cao đẳng.
-   Học viên học trực tuyến.
-   Hệ thống tổng quát, không giới hạn một nhóm cụ thể.

Sau khi xác định đối tượng, tiếp tục chốt hình thức hệ thống và vai trò
người dùng. Tiếp đó mới xác định chức năng, dữ liệu cần thu thập, bài
toán ML và kiến trúc chi tiết.

------------------------------------------------------------------------

## 11. Nhận định về trạng thái hiện tại

Đề tài đã có **hướng đi công nghệ và kiến trúc tổng thể tương đối rõ**,
nhưng **phạm vi nghiệp vụ và bài toán ML chưa được xác định đủ chi tiết
để bắt đầu lập trình chính thức**.

Rủi ro kỹ thuật lớn nhất hiện tại là khả năng tương thích của thư viện
ML với Python Workers. Rủi ro thiết kế lớn nhất là chưa chốt đối tượng,
hình thức hệ thống và mục tiêu dự đoán. Vì vậy, không nên vội tạo toàn
bộ database hoặc xây dựng các module trước khi hoàn tất các quyết định
này.

**Trạng thái chung: Đang phân tích yêu cầu và thiết kế; chưa bước vào
giai đoạn phát triển chính thức.**
