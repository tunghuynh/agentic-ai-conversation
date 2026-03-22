# Agent Rules for Aevum & Antigravity
1. **Context First & Handshake**: Luôn đọc `.aevum/index.json` và các file context liên quan trước khi bắt đầu Task. Khi nhận lệnh **BOOTSTRAP** từ hệ thống, Agent phải ngay lập tức nạp lại toàn bộ kiến thức dự án để đảm bảo đồng bộ tuyệt đối.
2. **Plan Sync**: Khi hoàn thành một tính năng, phải cập nhật file Plan tương ứng trong `.aevum/domains/[domain]/features/[feature_name]/plans/[plan_name].md`. Tuyệt đối không để `plans/` nằm trực tiếp trong `features/` mà không có thư mục [feature_name] tính năng ở giữa.
3. **Proactive Management**: Tự động tạo Plan mới khi phát hiện yêu cầu lớn chưa có trong kế hoạch.
4. **Vibe Code Harmony**: Đảm bảo code và tài liệu kế hoạch luôn đồng bộ.
5. **Structured Logic**:
    - Luôn sử dụng **YAML Frontmatter** ở đầu mỗi file Plan để định nghĩa dependencies và priority.
    - Duy trì cấu trúc phân cấp: **Domain -> Feature -> Plan**.
    - Trước khi viết code, hãy kiểm tra `.aevum/library/` để xem có tech stack hay patterns mẫu nào cần tuân thủ không.
6. **Incremental Updates**: Sau mỗi Request quan trọng, Agent phải cập nhật tiến độ vào file Plan tương ứng.
7. **Knowledge Pull**: Trước khi đưa ra quyết định kiến trúc hoặc logic quan trọng, phải truy vấn `.aevum/library/` hoặc `global/tech_stack.md`.
8. **Self-Evolution**: Agent phải chủ động phân tích mọi yêu cầu từ User. Nếu yêu cầu ngụ ý một quy chuẩn mới, cập nhật vào file này.
9. **Language Preference**: Luôn ưu tiên sử dụng tiếng Việt cho các tài liệu `implementation_plan.md`, `walkthrough.md` và các ghi chú quan trọng trong `.aevum`.
10. **Signal Detection & ACK**: Khi bắt đầu phiên làm việc, Agent phải kiểm tra file `.aevum/signal.json`. Nếu file này tồn tại và có type "BOOTSTRAP", Agent phải tự động đọc nội dung và phản hồi bằng cách ghi file `.aevum/ack.json` với nội dung `{ "signalId": "ID_TRONG_SIGNAL", "status": "SUCCESS" }`.
11. **Feedback & Evidence**: Sau khi hoàn thành một bước quan trọng hoặc phát hiện thấy lỗi/vấn đề cần lưu ý, Agent nên chủ động ghi lại vào thư mục `.aevum/evidence/` dưới dạng file Markdown hoặc log.
12. **Bridge Awareness**: Agent nên kiểm tra file `.aevum/current_plan.json` để xác định Plan nào đang được User chú trọng nhất tại thời điểm hiện tại.
13. **Active Indexing**: Khi thay đổi cấu trúc file hoặc thêm logic mới, Agent khuyến khích cập nhật `index.json` (nếu có thể) để giữ cho "bản đồ dự án" luôn chính xác.
14. **Reverse Plan Engineering**: Khi nạp kiến thức từ codebase cũ (EXISTING_CODEBASE), Agent ưu tiên tạo Plan cho mã nguồn đã có để đảm bảo tính kế thừa và quản lý dự án lâu dài.
15. **Neuro-inspired Memory (Bộ nhớ Sinh học)**:
    - **Selective Retention (Lọc tín hiệu)**: Không ghi mọi thứ vào `memory.md`. Chỉ ghi lại những "đột phá" trong logic, những lỗi gây tốn nhiều thời gian fix, hoặc các sở thích cốt lõi của user. Hãy coi đây là quá trình chuyển từ trí nhớ ngắn hạn sang dài hạn.
    - **Associative Linking (Liên kết ngữ cảnh)**: Khi ghi nhớ một bài học mới, hãy tìm cách liên kết nó với một node kiến trúc cụ thể trong `global/architecture.md` hoặc một Domain liên quan.
    - **Active Consolidation**: Luôn hỗ trợ hệ thống trong quá trình "Sleep & Consolidate" bằng cách tóm lược các phiên làm việc dài thành các "viên nén kiến thức" súc tích.

16. **Active Focus Beacon (Quyền năng Tiêu điểm)**: 
    - Khi phát hiện file `.aevum/active_focus.md` đang mở (hoặc tồn tại), Agent **BẮT BUỘC** phải coi đây là nguồn tín hiệu cao nhất và ưu tiên số 1.
    - Mọi suy luận, code và thái độ (Persona) phải bám sát 100% nội dung trong Beacon này.
    - Nếu có sự mâu thuẫn giữa code hiện tại và Beacon, hãy ưu tiên Beacon và cảnh báo cho user.
