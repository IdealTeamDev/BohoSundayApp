import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { FileText, Download, DollarSign, Users, Activity, Coffee } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export default function ReportsScreen() {
  const { user } = useAuthStore();
  const showRevenue = true; 
  
  const { tickets } = useDatabaseStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const loadOrders = useCallback(() => {
    setLoading(true);
    try {
      const ticketsArr = Object.values(tickets) as import('../../types').Ticket[];
      const mappedOrders = ticketsArr.map(t => ({
        orderId: t.order_id,
        buyerInfo: { name: t.buyer_name || 'Desconocido' },
        ticketName: t.ticket_name || t.zone || 'General',
        quantity: t.total_accesos || 0,
        accessesUsed: (t.total_accesos || 0) - (t.accesos_restantes || 0),
        price: Number(t.ticket_price || 0)
      }));
      setOrders(mappedOrders);
    } catch (err) {
      console.log('Error processing orders for reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tickets]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const availableTypes = Array.from(new Set(orders.map(o => o.ticketName || 'General')));
  
  const filteredOrders = orders.filter(o => filterType === 'all' || (o.ticketName || 'General') === filterType);

  // --- METRICS CALCULATION ---
  const totalOrders = filteredOrders.length;
  const totalCapacity = filteredOrders.reduce((acc, o) => acc + o.quantity, 0);
  const totalArrived = filteredOrders.reduce((acc, o) => acc + (o.accessesUsed || 0), 0);
  const overallPercentage = totalCapacity > 0 ? (totalArrived / totalCapacity) * 100 : 0;

  // Group by ticketName/zone
  const salesByTierMap = new Map();
  filteredOrders.forEach(o => {
    const key = o.ticketName || 'General';
    if (!salesByTierMap.has(key)) {
      salesByTierMap.set(key, { 
        name: key, 
        sold: 0, 
        capacity: 0,
        entered: 0, 
        revenue: 0 
      });
    }
    const tier = salesByTierMap.get(key);
    tier.sold += 1; // 1 order
    tier.capacity += o.quantity; // Total seats
    tier.entered += (o.accessesUsed || 0);
    tier.revenue += (o.price || 0);
  });

  const salesByTier = Array.from(salesByTierMap.values()).map(t => ({
    ...t,
    enteredPercentage: t.capacity > 0 ? (t.entered / t.capacity) * 100 : 0
  }));

  const totalRevenue = salesByTier.reduce((acc, t) => acc + t.revenue, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // --- EXPORT FUNCTIONS ---
  const generateCSV = async () => {
    try {
      if (orders.length === 0) {
        Alert.alert('Aviso', 'No hay datos de tickets para exportar.');
        return;
      }
      const header = "Order_ID,Comprador,Ticket,Cantidad,Ingresados,Monto\n";
      const rows = orders.map(o => 
        `${o.orderId},"${o.buyerInfo?.name}",${o.ticketName},${o.quantity},${o.accessesUsed || 0},${(o.price || 0) * o.quantity}`
      ).join('\n');
      
      const csv = header + rows;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Boho_Reporte_Ventas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // @ts-ignore
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!dir) return;
      // @ts-ignore
      const fileUri = dir + 'Boho_Reporte_Ventas.csv';
      
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { UTI: 'public.comma-separated-values-text', dialogTitle: 'Compartir Excel' });
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el CSV.');
    }
  };

  const generatePDF = async () => {
    try {
      if (filteredOrders.length === 0) {
        Alert.alert('Aviso', 'No hay datos para exportar.');
        return;
      }
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #231e1a; background-color: #f4efe9; }
              h1 { color: #47311f; font-size: 32px; border-bottom: 2px solid #686a54; padding-bottom: 10px; }
              .grid { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px; }
              .card { flex: 1; min-width: 200px; background-color: #d9d1c0; padding: 20px; border-radius: 12px; }
              .card-title { font-size: 14px; color: #686a54; text-transform: uppercase; margin-bottom: 5px; }
              .stat { font-size: 28px; font-weight: bold; color: #47311f; margin: 0; }
              .bar-track { background-color: #bdb39b; border-radius: 8px; height: 12px; width: 100%; margin-top: 8px; overflow: hidden; }
              .bar-fill { background-color: #686a54; height: 100%; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 30px; }
              th, td { text-align: left; padding: 12px; border-bottom: 1px solid #bdb39b; }
              th { background-color: #d9d1c0; color: #47311f; font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Boho Sunday - Reporte Detallado</h1>
            <p>Fecha de emisión: ${new Date().toLocaleDateString()}</p>
            
            <div class="grid">
              ${showRevenue ? `
              <div class="card">
                <div class="card-title">Ingresos Totales</div>
                <p class="stat">$${totalRevenue}</p>
              </div>
              ` : ''}
              <div class="card">
                <div class="card-title">Aforo (Ingresaron / Vendidos)</div>
                <p class="stat">${totalArrived} / ${totalCapacity}</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(overallPercentage, 100)}%;"></div></div>
              </div>
            </div>

            <h2 style="margin-top: 40px; color: #47311f;">Desglose por Etapas (Tiers)</h2>
            ${salesByTier.map(data => `
              <div style="margin-bottom: 25px; padding: 15px; border-left: 4px solid #686a54; background: #fff;">
                <h3 style="margin: 0 0 10px 0; color: #47311f;">${data.name}</h3>
                ${showRevenue ? `<p style="margin:0; font-size: 14px; color: #231e1a;"><strong>Ingresos:</strong> $${data.revenue}</p>` : ''}
                
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #686a54;">Ventas: ${data.sold}</p>
                
                <p style="margin: 15px 0 5px 0; font-size: 12px; color: #686a54;">Asistencia Real: ${data.entered} de ${data.sold} tickets vendidos (${Math.round(data.enteredPercentage)}%)</p>
                <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(data.enteredPercentage, 100)}%; background-color: #47311f;"></div></div>
              </div>
            `).join('')}

            <h2 style="margin-top: 40px; color: #47311f;">Últimos Escaneos Registrados</h2>
            <table>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Ingresaron</th>
              </tr>
              ${filteredOrders.filter(o => o.accessesUsed > 0).slice(0, 20).map(o => `
                <tr>
                  <td>${o.buyerInfo?.name}</td>
                  <td>${o.ticketName}</td>
                  <td>${o.quantity}</td>
                  <td>${o.accessesUsed}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', dialogTitle: 'Compartir PDF' });
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  // --- RENDER HELPERS ---
  const renderProgressBar = (percentage: number, color = '#47311f', bgColor = '#f0ebe1') => (
    <View style={[styles.progressBarTrack, { backgroundColor: bgColor }]}>
      <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#231e1a" />}
    >
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Métricas Generales</Text>
        <Text style={styles.headerSubtitle}>Resumen en tiempo real del evento</Text>
      </View>

      {loading && orders.length === 0 ? (
        <ActivityIndicator size="large" color="#1a1614" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={{ marginBottom: 24 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity 
                style={[styles.filterBtn, filterType === 'all' && styles.filterBtnActive]} 
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterBtnText, filterType === 'all' && styles.filterBtnTextActive]}>Todos</Text>
              </TouchableOpacity>
              {availableTypes.map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.filterBtn, filterType === type && styles.filterBtnActive]} 
                  onPress={() => setFilterType(type)}
                >
                  <Text style={[styles.filterBtnText, filterType === type && styles.filterBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* KPI CARDS */}
          <View style={styles.kpiContainer}>
            {showRevenue && (
              <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: 'rgba(255,255,255,0.8)' }]}>Ingresos Totales</Text>
                  <View style={styles.iconCircleLight}>
                    <DollarSign color="#fff" size={16} />
                  </View>
                </View>
                <Text style={[styles.kpiValue, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalRevenue)}</Text>
              </View>
            )}

            <View style={styles.kpiRow}>
              <View style={styles.kpiCardSmall}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Órdenes (Ventas)</Text>
                  <Activity color="#a39a85" size={16} />
                </View>
                <Text style={styles.kpiValueSmall}>{totalOrders}</Text>
              </View>

              <View style={styles.kpiCardSmall}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Aforo Ingresado</Text>
                  <Users color="#a39a85" size={16} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.kpiValueSmall}>{totalArrived}</Text>
                  <Text style={styles.kpiSubSmall}> / {totalCapacity}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Desglose por Zona / Ticket</Text>
            <Text style={styles.sectionSubtitle}>Ingresos y asistencia real de cada área</Text>
          </View>
          
          <View style={styles.listContainer}>
            {salesByTier.length > 0 ? salesByTier.map((data, idx) => (
              <View key={data.name} style={[styles.tierRow, idx === salesByTier.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.tierTop}>
                  <View>
                    <Text style={styles.tierName}>{data.name}</Text>
                    <Text style={styles.tierMeta}>{data.sold} reservas • {data.capacity} cupos</Text>
                  </View>
                  {showRevenue && <Text style={styles.tierRevenue}>{formatCurrency(data.revenue)}</Text>}
                </View>
                
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>Asistencia Real</Text>
                    <Text style={styles.progressValue}>{data.entered} / {data.capacity} ({Math.round(data.enteredPercentage)}%)</Text>
                  </View>
                  {renderProgressBar(data.enteredPercentage, '#c89d71', '#f5f0e6')}
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <FileText color="#a39a85" size={40} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No hay ventas registradas aún.</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exportación de Datos</Text>
            <Text style={styles.sectionSubtitle}>Descarga reportes para contabilidad</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.exportBtnCsv} onPress={generateCSV}>
              <FileText color="#47311f" size={20} />
              <Text style={styles.exportBtnTextCsv}>Descargar CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportBtnPdf} onPress={generatePDF}>
              <Download color="#fff" size={20} />
              <Text style={styles.exportBtnTextPdf}>Generar PDF</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5f1',
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  headerTitle: {
    color: '#1a1614',
    fontSize: 28,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#8b8378',
    fontSize: 15,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#1a1614',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
  },
  sectionSubtitle: {
    color: '#8b8378',
    fontSize: 13,
    fontFamily: 'NunitoSans_400Regular',
    marginTop: 2,
  },
  kpiContainer: {
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCardPrimary: {
    backgroundColor: '#1a1614',
    padding: 24,
  },
  kpiCardSmall: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  kpiCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiTitle: {
    color: '#8b8378',
    fontSize: 12,
    fontFamily: 'NunitoSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconCircleLight: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 36,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -1,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  filterBtnActive: {
    backgroundColor: '#1a1614',
    borderColor: '#1a1614',
  },
  filterBtnText: {
    color: '#8b8378',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 13,
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  kpiValueSmall: {
    color: '#1a1614',
    fontSize: 24,
    fontFamily: 'NunitoSans_800ExtraBold',
  },
  kpiSubSmall: {
    color: '#8b8378',
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tierRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe1',
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierName: {
    color: '#1a1614',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 2,
  },
  tierMeta: {
    color: '#8b8378',
    fontSize: 13,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  tierRevenue: {
    color: '#c89d71',
    fontSize: 18,
    fontFamily: 'NunitoSans_800ExtraBold',
  },
  progressSection: {
    backgroundColor: '#faf8f5',
    padding: 12,
    borderRadius: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#8b8378',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  progressValue: {
    color: '#1a1614',
    fontSize: 13,
    fontFamily: 'NunitoSans_700Bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8b8378',
    fontSize: 15,
    fontFamily: 'NunitoSans_600SemiBold',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  exportBtnCsv: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e2d5',
  },
  exportBtnPdf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1a1614',
  },
  exportBtnTextCsv: {
    color: '#1a1614',
    fontSize: 15,
    fontFamily: 'NunitoSans_700Bold',
    marginLeft: 8,
  },
  exportBtnTextPdf: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'NunitoSans_700Bold',
    marginLeft: 8,
  }
});
