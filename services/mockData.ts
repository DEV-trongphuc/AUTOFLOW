
import { Campaign, CampaignStatus, Subscriber, Template, Segment } from "../types";

export const seedData = () => {
  if (!localStorage.getItem('mailflow_initialized')) {
    
    const campaigns: Campaign[] = [
      {
        id: '1',
        name: 'Newsletter Tháng 7',
        subject: 'Cập nhật tính năng mới 🚀',
        status: CampaignStatus.SENT,
        sentAt: '2023-07-15T10:00:00Z',
        // Fix: Added missing target, reminders, senderEmail, and trackingEnabled properties to satisfy Campaign interface
        target: {
          listIds: ['l1'],
          segmentIds: [],
          tagIds: [],
          individualIds: []
        },
        reminders: [],
        senderEmail: 'marketing@company.com',
        trackingEnabled: true,
        stats: { sent: 1250, opened: 850, clicked: 320, bounced: 12, spam: 3 },
      },
    ];

    const lists = [
      { id: 'l1', name: 'Đăng ký Newsletter', count: 2, created: '10/10/2023', source: 'Web Form' },
      { id: 'l2', name: 'Khách hàng Tech Expo', count: 2, created: '15/11/2023', source: 'Import CSV' },
    ];

    const subscribers: Subscriber[] = [
      { 
        id: '1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Doe', status: 'active', 
        tags: ['customer', 'vip'], joinedAt: '2023-01-01T10:00:00Z',
        dateOfBirth: '1995-05-15',
        anniversaryDate: '2024-01-01',
        listIds: ['l1'],
        notes: [],
        stats: { emailsSent: 50, emailsOpened: 45, linksClicked: 20, lastOpenAt: '2023-10-01T14:30:00Z', lastClickAt: '2024-07-28T10:00:00Z' },
        customAttributes: { city: 'Hanoi' }
      },
      { 
        id: '2', email: 'bob@example.com', firstName: 'Bob', lastName: 'Smith', status: 'active', 
        tags: ['lead'], joinedAt: '2023-02-15T11:00:00Z',
        dateOfBirth: '1988-11-20',
        listIds: ['l1', 'l2'],
        notes: [],
        stats: { emailsSent: 12, emailsOpened: 2, linksClicked: 0, lastOpenAt: '2023-03-01T09:00:00Z' },
        customAttributes: { city: 'HCM' }
      },
      { 
        id: '3', email: 'charlie@example.com', firstName: 'Charlie', lastName: 'Brown', status: 'unsubscribed', 
        tags: [], joinedAt: '2023-03-10T12:00:00Z',
        listIds: ['l2'],
        notes: [],
        stats: { emailsSent: 5, emailsOpened: 1, linksClicked: 0, lastOpenAt: '2023-03-11T10:00:00Z' },
        customAttributes: { city: 'Da Nang' }
      },
    ];

    const vipCriteria = JSON.stringify([{ id: 'g1', conditions: [{ id: 'c1', field: 'tags', operator: 'contains', value: 'vip' }] }]);
    const inactiveCriteria = JSON.stringify([{ id: 'g1', conditions: [{ id: 'c1', field: 'status', operator: 'is', value: 'unsubscribed' }] }]);

    const segments: Segment[] = [
      { id: '1', name: 'Khách hàng VIP', description: 'Có nhãn VIP và đang hoạt động', count: 0, criteria: vipCriteria },
      { id: '2', name: 'Danh sách đen', description: 'Những người đã hủy đăng ký', count: 0, criteria: inactiveCriteria },
    ];

    localStorage.setItem('mailflow_campaigns', JSON.stringify(campaigns));
    localStorage.setItem('mailflow_subscribers', JSON.stringify(subscribers));
    localStorage.setItem('mailflow_segments', JSON.stringify(segments));
    localStorage.setItem('mailflow_lists', JSON.stringify(lists));
    localStorage.setItem('mailflow_templates', JSON.stringify([]));
    localStorage.setItem('mailflow_initialized', 'true');
  }
};
