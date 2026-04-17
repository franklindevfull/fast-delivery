
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { db } from '../services/db';
import { Order, OrderStatus, SaleType } from '../types';
import { Icons } from '../constants';
import { useTheme } from '../components/ThemeProvider';
import { formatCurrency } from '../services/formatUtils';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'indicators' | 'charts'>('indicators');
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const labelColor = isDark ? '#64748b' : '#94a3b8';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Calculamos o início do mês atual para buscar uma quantidade relevante de dados
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        const [allOrders, allClients] = await Promise.all([
          db.getOrders(firstDayOfMonth), // Buscamos pedidos desde o início do mês para as métricas mensais
          db.getClients()
        ]);
        setOrders(allOrders);
        setClientCount(allClients.length);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    setIsMounted(true);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR');
    
    // Início da Semana (Segunda-feira)
    const monday = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    // Início do Mês
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
    
    const todayOrders = orders.filter(o => new Date(o.createdAt).toLocaleDateString('pt-BR') === todayStr);
    const deliveredToday = todayOrders.filter(o => o.status === OrderStatus.DELIVERED);
    const revenueToday = deliveredToday.reduce((acc, o) => acc + o.total, 0);

    const weekOrders = orders.filter(o => new Date(o.createdAt) >= monday);
    const deliveredWeek = weekOrders.filter(o => o.status === OrderStatus.DELIVERED);
    const revenueWeek = deliveredWeek.reduce((acc, o) => acc + o.total, 0);

    const monthOrders = orders.filter(o => new Date(o.createdAt) >= firstOfMonth);
    const deliveredMonth = monthOrders.filter(o => o.status === OrderStatus.DELIVERED);
    const revenueMonth = deliveredMonth.reduce((acc, o) => acc + o.total, 0);

    const avgTicket = deliveredMonth.length > 0 ? revenueMonth / deliveredMonth.length : 0;

    return {
      revenueToday,
      revenueWeek,
      revenueMonth,
      ordersMonth: monthOrders.length,
      avgTicket,
      totalClients: clientCount
    };
  }, [orders, clientCount]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('pt-BR');
    });

    return last7Days.map(dateStr => {
      const dayOrders = orders.filter(o => new Date(o.createdAt).toLocaleDateString('pt-BR') === dateStr);
      const revenue = dayOrders.filter(o => o.status === OrderStatus.DELIVERED).reduce((acc, o) => acc + o.total, 0);
      return {
        name: dateStr.split('/')[0] + '/' + dateStr.split('/')[1],
        vendas: revenue,
        pedidos: dayOrders.length
      };
    });
  }, [orders]);

  const paymentData = useMemo(() => {
    const methods: Record<string, number> = {
      'DINHEIRO': 0,
      'PIX': 0,
      'CRÉDITO': 0,
      'DÉBITO': 0
    };

    orders.filter(o => o.status === OrderStatus.DELIVERED).forEach(order => {
      const method = order.paymentMethod || 'DINHEIRO';
      if (methods[method] !== undefined) {
        methods[method] += order.total;
      }
    });

    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const deliveryData = useMemo(() => {
    const types: Record<string, number> = {
      [SaleType.OWN_DELIVERY]: 0,
      [SaleType.COUNTER]: 0,
      [SaleType.TABLE]: 0
    };

    orders.forEach(order => {
      if (types[order.type] !== undefined) {
        types[order.type] += 1;
      }
    });

    return [
      { name: 'Delivery', value: types[SaleType.OWN_DELIVERY], color: '#4f46e5' },
      { name: 'Balcão', value: types[SaleType.COUNTER], color: '#10b981' },
      { name: 'Mesa', value: types[SaleType.TABLE], color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [orders]);

  const COLORS_PAYMENT = ['#10b981', '#4f46e5', '#f59e0b', '#ef4444'];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* Header com Switcher de Telas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Acompanhamento em tempo real</p>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('indicators')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'indicators'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            Indicadores
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'charts'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            Gráficos
          </button>
        </div>
      </div>

      {activeTab === 'indicators' ? (
        <div className="flex-1 flex flex-col justify-center space-y-12 py-8 min-h-[70vh]">
          {/* Grid de Métricas Principais - Otimizado para monitores grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6 sm:gap-8">
            <MetricCard
              icon={<Icons.DollarSign />}
              label="Faturamento (Hoje)"
              value={formatCurrency(stats.revenueToday)}
              color="blue"
            />
            <MetricCard
              icon={<Icons.TrendingUp />}
              label="Esta Semana"
              value={formatCurrency(stats.revenueWeek)}
              color="emerald"
            />
            <MetricCard
              icon={<Icons.Calendar />}
              label="Este Mês"
              value={formatCurrency(stats.revenueMonth)}
              color="indigo"
            />
            <MetricCard
              icon={<Icons.Ticket />}
              label="Ticket Médio"
              value={formatCurrency(stats.avgTicket)}
              color="amber"
            />
            <MetricCard
              icon={<Icons.Users />}
              label="Base Clientes"
              value={stats.totalClients.toString()}
              color="purple"
            />
            <MetricCard
              icon={<Icons.Package />}
              label="Pedidos (Mês)"
              value={stats.ordersMonth.toString()}
              color="rose"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Mix de Pagamentos em Cards */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="mb-8">
                <h3 className="text-slate-800 dark:text-white font-black uppercase tracking-tight text-lg">Mix de Pagamentos</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Volume financeiro acumulado no mês</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {paymentData.map((item, idx) => (
                  <div key={idx} className="p-6 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] min-h-[200px]">
                    <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center shadow-sm`} style={{ backgroundColor: `${COLORS_PAYMENT[idx % COLORS_PAYMENT.length]}15`, color: COLORS_PAYMENT[idx % COLORS_PAYMENT.length], border: `1px solid ${COLORS_PAYMENT[idx % COLORS_PAYMENT.length]}30` }}>
                      <Icons.CreditCard size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{item.name}</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{formatCurrency(item.value)}</p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-6 overflow-hidden max-w-[80px]">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          backgroundColor: COLORS_PAYMENT[idx % COLORS_PAYMENT.length],
                          width: `${Math.max(5, (item.value / (stats.revenueMonth || 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canais de Venda em Cards */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="mb-8">
                <h3 className="text-slate-800 dark:text-white font-black uppercase tracking-tight text-lg">Canais de Vendas</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Frequência mensal por canal</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveryData.map((item, idx) => (
                  <div key={idx} className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] min-h-[220px]">
                    <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center shrink-0 mb-6 shadow-sm" style={{ backgroundColor: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30` }}>
                      {item.name === 'Delivery' && <Icons.Truck size={40} />}
                      {item.name === 'Balcão' && <Icons.User size={40} />}
                      {item.name === 'Mesa' && <Icons.Table size={40} />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{item.name}</p>
                      <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{item.value}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest opacity-60">Pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Gráfico de Vendas de 7 dias */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="text-slate-800 dark:text-white font-black uppercase tracking-tight text-lg">Fluxo Financeiro</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Últimos 7 dias de operação</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Total Semana</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(chartData.reduce((acc, d) => acc + d.vendas, 0))}</p>
                </div>
              </div>
              <div className="h-[350px] w-full relative">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: labelColor, fontSize: 10, fontWeight: 700 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: labelColor, fontSize: 10, fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: isDark ? '#0f172a' : '#ffffff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                        itemStyle={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}
                        labelStyle={{ color: isDark ? '#cbd5e1' : '#64748b', fontWeight: 700, marginBottom: '5px' }}
                      />
                      <Area type="monotone" dataKey="vendas" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico de Volume de Pedidos */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col">
              <h3 className="text-slate-800 dark:text-white font-black uppercase tracking-tight text-lg mb-1">Volume de Pedidos</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-8">Frequência diária</p>
              <div className="flex-1 min-h-[300px] h-[350px] relative">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: labelColor, fontSize: 10, fontWeight: 700 }} />
                      <Tooltip
                        cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                        contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: isDark ? '#0f172a' : '#ffffff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                      />
                      <Bar dataKey="pedidos" radius={[10, 10, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#4f46e5' : isDark ? '#334155' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Performance Semanal</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (chartData[chartData.length - 1]?.pedidos / 20) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Análise por Tipo de Pagamento */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col">
              <div className="mb-6">
                <h3 className="text-slate-800 dark:text-white font-black uppercase tracking-tight text-lg">Distribuição Mensal</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Participação por método de pagamento</p>
              </div>
              <div className="h-80 w-full relative">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_PAYMENT[index % COLORS_PAYMENT.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: isDark ? '#0f172a' : '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: isDark ? '#cbd5e1' : '#1e293b' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: labelColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Acompanhamento do Delivery */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col">
              <div className="mb-6">
                <h3 className="text-slate-800 dark:text-white font-black uppercase tracking-tight text-lg">Volume por Canal</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Proporção de vendas do período</p>
              </div>
              <div className="h-80 w-full relative">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {deliveryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '15px', border: 'none', backgroundColor: isDark ? '#0f172a' : '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: isDark ? '#cbd5e1' : '#1e293b' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Card Reutilizável
const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: string, color: string }> = ({ icon, label, value, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
  };

  const isCurrency = value.includes('R$');

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 xl:p-6 2xl:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02] hover:shadow-md dark:hover:border-slate-700 flex flex-col items-center justify-center text-center min-h-[200px]">
      <div className={`w-14 h-14 sm:w-16 sm:h-16 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 rounded-2xl sm:rounded-[2rem] flex items-center justify-center shrink-0 mb-4 sm:mb-6 shadow-sm border border-current/10 ${colors[color] || colors.blue}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 28 })}
      </div>
      <div className="w-full">
        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mb-2 truncate">{label}</p>
        <h3 className={`font-black text-slate-800 dark:text-white uppercase tracking-tighter whitespace-nowrap leading-none ${
          isCurrency 
            ? 'text-lg sm:text-2xl xl:text-lg 2xl:text-3xl' 
            : 'text-2xl sm:text-4xl xl:text-2xl 2xl:text-4xl'
        }`}>
          {value}
        </h3>
      </div>
    </div>
  );
};

export default Dashboard;
