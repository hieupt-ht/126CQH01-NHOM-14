import type { ArtworkRegion } from '../../components/dashboard/ReferenceArtwork';
export type DemoArtwork = { id: string; title: string; prompt: string; category: string; region: ArtworkRegion };
// Reference illustrations only, not account records or FLUX API outputs.
export const demoArtworks: DemoArtwork[] = [
  { id: 'city', title: 'Thành phố của những ánh đèn', category: 'Cyberpunk', prompt: 'Thành phố tương lai trong đêm mưa, ánh đèn neon xanh tím phản chiếu trên mặt đường, một người cầm ô đi giữa phố.', region: { x: 294, y: 617, width: 292, height: 165 } },
  { id: 'portrait', title: 'Nàng thơ giữa sắc hoa xanh', category: 'Chân dung', prompt: 'Chân dung cô gái tóc xanh bạc, những bông hoa nhỏ trên tóc, ánh sáng dịu và bokeh xanh, phong cách fantasy.', region: { x: 605, y: 617, width: 292, height: 165 } },
  { id: 'mountains', title: 'Hoàng hôn phía bên kia đỉnh núi', category: 'Phong cảnh', prompt: 'Dãy núi hùng vĩ giữa biển mây, hoàng hôn tím hồng, ánh sáng mềm mại, khung cảnh điện ảnh rộng lớn.', region: { x: 916, y: 617, width: 289, height: 165 } },
  { id: 'cat', title: 'Nhà du hành nhỏ của vũ trụ', category: 'Sáng tạo', prompt: 'Một chú mèo cam đáng yêu mặc bộ đồ phi hành gia, lơ lửng giữa các vì sao và tinh vân xanh tím.', region: { x: 1225, y: 617, width: 291, height: 165 } },
  { id: 'forest', title: 'Khu rừng của những giấc mơ', category: 'Fantasy', prompt: 'Khu rừng thần tiên với cây cổ thụ phát sáng xanh, một cô gái đứng bên dòng nước, ánh sáng huyền ảo.', region: { x: 294, y: 851, width: 292, height: 164 } },
  { id: 'temple', title: 'Một đêm trăng ở phương Đông', category: 'Kiến trúc', prompt: 'Ngôi đền phương Đông dưới trăng tròn, cây phong lá đỏ và mặt hồ phản chiếu, đêm xanh sâu yên bình.', region: { x: 605, y: 851, width: 292, height: 164 } },
  { id: 'castle', title: 'Tòa thành trên những tầng mây', category: 'Fantasy', prompt: 'Lâu đài cổ tích trên hòn đảo nổi giữa biển mây, ánh hoàng hôn vàng hồng và thác nước huyền ảo.', region: { x: 916, y: 851, width: 289, height: 164 } },
  { id: 'butterfly', title: 'Khi những cánh bướm phát sáng', category: 'Anime', prompt: 'Cô gái tóc đen giữa những cánh bướm phát sáng tím hồng, chân dung anime, ánh sáng huyền ảo và nền đêm.', region: { x: 1225, y: 851, width: 291, height: 164 } },
];
export const promptExamples = [demoArtworks[0].prompt, demoArtworks[2].prompt, demoArtworks[3].prompt];
