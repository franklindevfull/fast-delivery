import React, { useState, useEffect } from 'react';
import { Bell, Copy, Check, X, Megaphone, Ticket } from 'lucide-react';

export interface BaseCampaign {
  id: string;
  title: string;
  message: string;
  type: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CouponItem {
  id: string;
  code: string;
  description?: string;
  type: string;
  value: number;
  active: boolean;
}

interface NotificationCenterProps {
  campaigns: BaseCampaign[];
  coupons: CouponItem[];
}

interface NotificationItem {
  id: string;
  type: 'CAMPAIGN' | 'COUPON';
  title: string;
  message: string;
  imageUrl?: string;
  code?: string;
  date: string;
  isRead: boolean;
  value?: number;
  couponType?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ campaigns, coupons }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalItem, setModalItem] = useState<NotificationItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      // 1. Recover read state from localStorage
      const readCampaigns: string[] = JSON.parse(localStorage.getItem('read_campaigns') || '[]');
      const readCoupons: string[] = JSON.parse(localStorage.getItem('read_coupons') || '[]');
      
      const items: NotificationItem[] = [];

      // 2. Parse campaigns
      campaigns.forEach(c => {
        items.push({
          id: c.id,
          type: 'CAMPAIGN',
          title: c.title,
          message: c.message,
          imageUrl: c.imageUrl,
          date: c.createdAt,
          isRead: readCampaigns.includes(c.id),
        });
      });

      // 3. Parse coupons
      coupons.forEach(c => {
        items.push({
          id: c.id,
          type: 'COUPON',
          title: `🏷️ Cupom: ${c.code}`,
          message: c.description || 'Aproveite nosso cupom especial!',
          code: c.code,
          date: new Date().toISOString(), // Coupons don't expose createdAt in the standard payload but it's active
          isRead: readCoupons.includes(c.id),
          value: c.value,
          couponType: c.type
        });
      });

      // 4. Sort by newest
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setNotifications(items);
      setUnreadCount(items.filter(i => !i.isRead).length);

      // 5. If there's an UNREAD Campaign, show it as an intrusive Modal strictly ONCE per load if not viewed yet.
      const firstUnreadCampaign = items.find(i => i.type === 'CAMPAIGN' && !i.isRead);
      if (firstUnreadCampaign) {
        setModalItem(firstUnreadCampaign);
      }

    } catch (e) {
      console.error('Error handling notifications:', e);
    }
  }, [campaigns, coupons]);

  const markAsRead = (id: string, type: 'CAMPAIGN' | 'COUPON') => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (type === 'CAMPAIGN') {
      const readCampaigns = JSON.parse(localStorage.getItem('read_campaigns') || '[]');
      if (!readCampaigns.includes(id)) {
        localStorage.setItem('read_campaigns', JSON.stringify([...readCampaigns, id]));
      }
    } else {
      const readCoupons = JSON.parse(localStorage.getItem('read_coupons') || '[]');
      if (!readCoupons.includes(id)) {
        localStorage.setItem('read_coupons', JSON.stringify([...readCoupons, id]));
      }
    }
  };

  const handleCloseModal = () => {
    if (modalItem) {
      markAsRead(modalItem.id, modalItem.type);
      setModalItem(null);
    }
  };

  const markAllAsRead = () => {
    const unreadCampaigns = notifications.filter(n => n.type === 'CAMPAIGN' && !n.isRead).map(n => n.id);
    const unreadCoupons = notifications.filter(n => n.type === 'COUPON' && !n.isRead).map(n => n.id);
    
    if (unreadCampaigns.length > 0) {
      const readCampaigns = JSON.parse(localStorage.getItem('read_campaigns') || '[]');
      localStorage.setItem('read_campaigns', JSON.stringify([...readCampaigns, ...unreadCampaigns]));
    }
    
    if (unreadCoupons.length > 0) {
      const readCoupons = JSON.parse(localStorage.getItem('read_coupons') || '[]');
      localStorage.setItem('read_coupons', JSON.stringify([...readCoupons, ...unreadCoupons]));
    }

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <div className="relative">
        <button 
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) markAllAsRead();
          }}
          className="relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black uppercase flex items-center justify-center rounded-full border-2 border-white px-1 shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Slide Out Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-[51] animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notificações
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center opacity-50">
                  <Bell className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Nenhuma novidade por enquanto</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-2xl border transition-all ${!n.isRead ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 rounded-full p-2 ${n.type === 'CAMPAIGN' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {n.type === 'CAMPAIGN' ? <Megaphone className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 text-sm">{n.title}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        
                        {n.type === 'COUPON' && n.code && (
                          <div className="mt-3">
                            <button 
                              onClick={() => copyCode(n.code!)}
                              className={`w-full py-2 px-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all
                                ${copiedCode === n.code 
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                                  : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600'
                                }`}
                            >
                              {copiedCode === n.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedCode === n.code ? 'Copiado!' : n.code}
                            </button>
                          </div>
                        )}
                        
                        {n.type === 'CAMPAIGN' && n.imageUrl && (
                          <div className="mt-2 text-xs font-bold text-blue-600 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => setModalItem(n)}>
                            Ver Detalhes &rarr;
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Highlight Central Modal (Auto-Pop for Campaigns or Click for Details) */}
      {modalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div 
            className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {modalItem.imageUrl && (
              <div className="relative w-full h-48 bg-slate-100 group">
                <img src={modalItem.imageUrl} alt={modalItem.title} className="w-full h-full object-cover" />
                <button 
                  onClick={handleCloseModal}
                  className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className={`p-6 ${!modalItem.imageUrl ? 'pt-8 relative' : ''}`}>
               {!modalItem.imageUrl && (
                  <button 
                    onClick={handleCloseModal}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
               )}
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  NOVIDADE
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-3">
                {modalItem.title}
              </h2>
              <p className="text-slate-600 text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
                {modalItem.message}
              </p>
              
              <button
                onClick={handleCloseModal}
                className="mt-6 w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
