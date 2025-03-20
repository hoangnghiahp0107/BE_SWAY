export class CreateDriverRatingDto {
  customer_id: number; // ID của khách hàng đánh giá
  driver_id: number; // ID của tài xế được đánh giá
  trip_id: number; // ID của chuyến đi (phải hoàn thành mới được đánh giá)
  rating: number; // Điểm đánh giá (1 - 5)
  review?: string; // Nhận xét (không bắt buộc)
}
export class GetDriverRatingsDto {
  driver_id: number; // ID của tài xế cần lấy đánh giá
}
export class GetDriverAverageRatingDto {
  driver_id: number; // ID của tài xế cần lấy điểm trung bình
}
