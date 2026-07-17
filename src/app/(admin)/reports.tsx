import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCOP } from '../../utils/format';
import { FileText, Download, DollarSign, Users, Activity, Coffee } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export default function ReportsScreen() {
  const { user } = useAuthStore();
  const showRevenue = true; 
  
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  
  const { tickets, tables } = useDatabaseStore();
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

      let html = `
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #47311f; padding: 20px; }
            h1 { font-size: 24px; color: #47311f; margin-bottom: 5px; }
            h2 { font-size: 18px; color: #47311f; margin-top: 30px; border-bottom: 1px solid #d9d1c0; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #d9d1c0; padding: 8px; text-align: left; font-size: 14px; }
            th { background-color: #f0ebe1; color: #47311f; }
            .date { color: #8b8378; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Boho Sunday - Reporte Detallado</h1>
          <div class="date">Fecha de emisión: ${new Date().toLocaleString()}</div>

          <h2>Resumen General</h2>
          <table>
            <tr><th>Métrica</th><th>Valor</th></tr>
      `;

      if (showRevenue) html += `<tr><td>Ingresos Totales</td><td>${formatCOP(totalRevenue)}</td></tr>`;
      html += `
            <tr><td>Aforo (Ingresaron / Vendidos)</td><td>${totalArrived} / ${totalCapacity}</td></tr>
            <tr><td>Porcentaje de Asistencia</td><td>${Math.round(overallPercentage)}%</td></tr>
          </table>

          <h2>Desglose por Etapas</h2>
          <table>
            <tr>
              <th>Etapa</th>
              <th>Vendidos</th>
              <th>Ingresaron</th>
              <th>Asistencia</th>
              ${showRevenue ? '<th>Ingresos</th>' : ''}
            </tr>
      `;

      salesByTier.forEach(t => {
        html += `
          <tr>
            <td>${t.name}</td>
            <td>${t.sold}</td>
            <td>${t.entered}</td>
            <td>${Math.round(t.enteredPercentage)}%</td>
            ${showRevenue ? `<td>${formatCOP(t.revenue)}</td>` : ''}
          </tr>
        `;
      });
      html += `</table>`;

      if (tables && tables.length > 0) {
        const tablesStats = { free: 0, reserved: 0, occupied: 0, blocked: 0 };
        tables.forEach(table => {
          const ticket = Object.values(tickets).find(t => t.ticket_id === table.id);
          if (table.available) tablesStats.free++;
          else if (!ticket) tablesStats.blocked++;
          else if (ticket.accesos_restantes === ticket.total_accesos) tablesStats.reserved++;
          else tablesStats.occupied++;
        });

        html += `
          <h2>Estado de Mesas</h2>
          <div style="font-size: 13px; color: #686a54; margin-bottom: 10px;">
            Libres: ${tablesStats.free} | Reservadas: ${tablesStats.reserved} | Ocupadas: ${tablesStats.occupied} | Bloqueadas: ${tablesStats.blocked}
          </div>
          <table>
            <tr><th>Mesa</th><th>Aforo</th><th>Estado</th><th>Comprador</th></tr>
        `;

        tables.forEach(table => {
          const ticket = Object.values(tickets).find(t => t.ticket_id === table.id);
          let statusText = '';
          if (table.available) statusText = 'Libre';
          else if (!ticket) statusText = 'Bloqueada';
          else if (ticket.accesos_restantes === ticket.total_accesos) statusText = 'Reservada';
          else statusText = 'Ocupada';
          
          html += `
            <tr>
              <td>${table.name} ${table.id.split('-').pop()}</td>
              <td>${table.persons} pax</td>
              <td>${statusText}</td>
              <td>${ticket ? ticket.buyer_name || 'Desconocido' : '-'}</td>
            </tr>
          `;
        });
        html += `</table>`;
      }

      html += `
          <h2>Últimos Asistentes Registrados (Max 50)</h2>
      `;

      const attendeeLogs = filteredOrders
        .filter(o => o.accessesUsed > 0)
        .slice(0, 50);
        
      if (attendeeLogs.length > 0) {
        html += `
          <table>
            <tr><th>Nombre</th><th>Tipo / Mesa</th><th>Accesos Comprados</th><th>Ingresaron</th></tr>
        `;
        attendeeLogs.forEach(o => {
          html += `
            <tr>
              <td>${o.buyerInfo?.name || 'Desconocido'}</td>
              <td>${o.ticketName || 'General'}</td>
              <td>${o.quantity}</td>
              <td>${o.accessesUsed}</td>
            </tr>
          `;
        });
        html += `</table>`;
      } else {
        html += `<p style="color:#686a54;">No hay ingresos registrados aún.</p>`;
      }

      html += `
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
        }
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', dialogTitle: 'Compartir Reporte PDF' });
      } else {
        Alert.alert('Éxito', 'PDF generado: ' + uri);
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
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 10, maxWidth: isDesktop ? 1000 : '100%', alignSelf: 'center', width: '100%' }}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
            </View>
          </View>

          {/* KPI CARDS */}
          <View style={[styles.kpiContainer, isDesktop && { flexDirection: 'row' }]}>
            {showRevenue && (
              <View style={[styles.kpiCard, styles.kpiCardPrimary, isDesktop && { flex: 2 }]}>
                <View style={styles.kpiHeader}>
                  <Text style={[styles.kpiTitle, { color: 'rgba(255,255,255,0.8)' }]}>Ingresos Totales</Text>
                  <View style={styles.iconCircleLight}>
                    <DollarSign color="#fff" size={16} />
                  </View>
                </View>
                <Text style={[styles.kpiValue, { color: '#f4efe9' }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalRevenue)}</Text>
              </View>
            )}

            <View style={[styles.kpiRow, isDesktop && { flex: 3 }]}>
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
          
          <View style={[styles.listContainer, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 16, backgroundColor: 'transparent', borderWidth: 0, padding: 0, elevation: 0 }]}>
            {salesByTier.length > 0 ? salesByTier.map((data, idx) => (
              <View key={data.name} style={[styles.tierRow, idx === salesByTier.length - 1 && !isDesktop && { borderBottomWidth: 0 }, isDesktop && { width: '48%', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#f0ebe1' }]}>
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
    backgroundColor: '#f4efe9',
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  headerTitle: {
    color: '#231e1a',
    fontSize: 28,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#bdb39b',
    fontSize: 15,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
  },
  sectionSubtitle: {
    color: '#bdb39b',
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
    backgroundColor: '#686a54',
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
    color: '#bdb39b',
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
    fontFamily: 'NunitoSans_700Bold',
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
    backgroundColor: '#686a54',
    borderColor: '#1a1614',
  },
  filterBtnText: {
    color: '#bdb39b',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 13,
  },
  filterBtnTextActive: {
    color: '#f4efe9',
  },
  kpiValueSmall: {
    color: '#231e1a',
    fontSize: 24,
    fontFamily: 'NunitoSans_700Bold',
  },
  kpiSubSmall: {
    color: '#bdb39b',
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
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 2,
  },
  tierMeta: {
    color: '#bdb39b',
    fontSize: 13,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  tierRevenue: {
    color: '#c89d71',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
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
    color: '#bdb39b',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  progressValue: {
    color: '#231e1a',
    fontSize: 13,
    fontFamily: 'NunitoSans_700Bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#bdb39b',
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
    backgroundColor: '#686a54',
  },
  exportBtnTextCsv: {
    color: '#231e1a',
    fontSize: 15,
    fontFamily: 'NunitoSans_700Bold',
    marginLeft: 8,
  },
  exportBtnTextPdf: {
    color: '#f4efe9',
    fontSize: 15,
    fontFamily: 'NunitoSans_700Bold',
    marginLeft: 8,
  }
});
