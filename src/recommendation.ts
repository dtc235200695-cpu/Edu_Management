// src/recommendation.ts
// Engine cá nhân hóa lộ trình học tập dựa trên điểm số theo chủ đề và quy tắc sư phạm

export interface RecommendedPath {
  topic_name: string;
  current_score: number;
  priority: 'Ưu tiên cao' | 'Ưu tiên trung bình' | 'Ưu tiên thấp' | 'Mở rộng';
  target_goal: string;
  learning_materials: string;
  practice_exercises: string;
  resource_url: string;
  status: 'Chưa hoàn thành' | 'Đang học' | 'Đã hoàn thành';
}

export function generatePersonalizedPath(topicScores: Array<{ topic_name: string; score: number }>): RecommendedPath[] {
  return topicScores.map(t => {
    const s = t.score;
    let priority: RecommendedPath['priority'];
    let target_goal: string;
    let learning_materials: string;
    let practice_exercises: string;
    let resource_url: string;
    let status: RecommendedPath['status'] = 'Chưa hoàn thành';
    
    if (s < 5.0) {
      // Dưới 5 điểm: học lại kiến thức cơ bản
      priority = 'Ưu tiên cao';
      target_goal = 'Đạt tối thiểu 6.5/10 - Nắm chắc khái niệm và kiến thức cốt lõi';
      learning_materials = 'Xem lại video bài giảng tuần 1-3, slide tổng quan và tài liệu nhập môn cơ bản';
      practice_exercises = 'Hoàn thành bộ câu hỏi trắc nghiệm ôn tập và 5 bài tập thực hành có hướng dẫn từng bước';
      resource_url = 'https://developers.cloudflare.com/workers/get-started/guide/';
      status = 'Chưa hoàn thành';
    } else if (s < 7.0) {
      // 5 đến dưới 7 điểm: luyện tập bổ sung
      priority = 'Ưu tiên trung bình';
      target_goal = 'Đạt tối thiểu 8.0/10 - Củng cố kỹ năng giải quyết bài toán trung bình';
      learning_materials = 'Tài liệu hướng dẫn thực hành chuyên sâu, bài viết kiến trúc và case study';
      practice_exercises = 'Làm bài kiểm tra mô phỏng 15 câu và 3 bài tập thực hành tình huống độc lập';
      resource_url = 'https://developers.cloudflare.com/d1/platform/migrations/';
      status = 'Đang học';
    } else if (s < 8.5) {
      // 7 đến dưới 8.5 điểm: học nội dung nâng cao
      priority = 'Ưu tiên thấp';
      target_goal = 'Đạt 9.0+/10 - Nâng cao năng lực thiết kế và tối ưu hiệu năng';
      learning_materials = 'Tài liệu kỹ thuật nâng cao về tối ưu hóa độ trễ, caching và scaling hệ thống';
      practice_exercises = 'Thực hiện 2 mini-project áp dụng thực tế và review code theo best practices';
      resource_url = 'https://developers.cloudflare.com/workers/runtime-apis/';
      status = 'Đang học';
    } else {
      // 8.5 điểm trở lên: học chuyên đề mở rộng
      priority = 'Mở rộng';
      target_goal = 'Nghiên cứu chuyên sâu, làm đồ án lớn hoặc hỗ trợ hướng dẫn bạn bè trong nhóm';
      learning_materials = 'Tài liệu nghiên cứu công nghệ mới, paper hội thảo và open-source architectures';
      practice_exercises = 'Xây dựng module mở rộng tích hợp AI/Edge Computing thực tế';
      resource_url = 'https://developers.cloudflare.com/workers-ai/models/';
      status = 'Đã hoàn thành';
    }
    
    return {
      topic_name: t.topic_name,
      current_score: s,
      priority,
      target_goal,
      learning_materials,
      practice_exercises,
      resource_url,
      status
    };
  }).sort((a, b) => {
    // Sắp xếp ưu tiên: Điểm thấp xếp trước (Ưu tiên cao lên đầu)
    return a.current_score - b.current_score;
  });
}
