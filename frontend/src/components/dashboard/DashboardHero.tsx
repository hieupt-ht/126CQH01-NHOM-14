import Icon from '../ui/Icon';
import StudioHero from './StudioHero';
export default function DashboardHero() {
  return <StudioHero id="dashboard-title" eyebrow="KHÔNG GIAN SÁNG TẠO VỚI AI"
    title={<>Biến ý tưởng<br />thành <span>hiện thực.</span></>}
    description={<>Một dòng mô tả. Một thế giới mới.<br />Khơi nguồn sáng tạo cùng FLUX STUDIO.</>}>
    <div className="dashboard-hero__features"><span><Icon name="shield" size={16} />Tự do ý tưởng</span><span><Icon name="bolt" size={16} />Sáng tạo cùng FLUX</span><span><Icon name="image" size={16} />Lưu giữ cảm hứng</span></div>
  </StudioHero>;
}
