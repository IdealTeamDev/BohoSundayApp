import fs from 'fs';

let content = fs.readFileSync('src/app/(admin)/dashboard.tsx', 'utf8');

// We need to implement grouped lists for "Entradas", "Camas", "Mesas"
const groupedListCode = `
        {/* GROUPED PRODUCTS */}
        {['ticket', 'bed', 'table'].map(category => {
          const catProducts = products.filter(p => p.type === category);
          if (catProducts.length === 0) return null;
          
          const title = category === 'ticket' ? 'Entradas' : category === 'bed' ? 'Camas' : 'Mesas';
          const isCollapsed = category === 'ticket' ? isProductsCollapsed : category === 'bed' ? isBedsCollapsed : isTablesCollapsed;
          const toggle = () => {
            if (category === 'ticket') setIsProductsCollapsed(!isProductsCollapsed);
            if (category === 'bed') setIsBedsCollapsed(!isBedsCollapsed);
            if (category === 'table') setIsTablesCollapsed(!isTablesCollapsed);
          };

          return (
            <View key={category} style={{ marginBottom: 16 }}>
              <TouchableOpacity 
                style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 0 }]} 
                onPress={toggle}
              >
                <View>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{title} ({catProducts.length})</Text>
                </View>
                {isCollapsed ? <ChevronDown color="#231e1a" size={24} /> : <ChevronUp color="#231e1a" size={24} />}
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={[styles.listContainer, { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -8, paddingTop: 16 }]}>
                  {catProducts.map((p, idx) => (
                    <View key={p.id} style={[styles.listItem, idx === catProducts.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listItemName}>{p.name}</Text>
                        <Text style={styles.listItemMeta}>{p.type.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.listItemValue}>{formatCOP(p.basePrice)}</Text>
                      <TouchableOpacity onPress={() => removeProduct(p.id, p.type)} style={styles.deleteBtnIcon}>
                        <Trash2 color="#ff4d4d" size={20} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
`;

// Add states
content = content.replace("const [isProductsCollapsed, setIsProductsCollapsed] = useState(true);", 
  "const [isProductsCollapsed, setIsProductsCollapsed] = useState(true);\n  const [isBedsCollapsed, setIsBedsCollapsed] = useState(true);\n  const [isTablesCollapsed, setIsTablesCollapsed] = useState(true);");

// Replace the current global products list rendering with groupedListCode
const startIdx = content.indexOf("{/* GLOBAL PRODUCTS SECTION */}");
const endIdx = content.indexOf("{/* TIERS MANAGEMENT SECTION */}");

if (startIdx !== -1 && endIdx !== -1) {
  let formCardIdx = content.indexOf("<View style={styles.formCard}>", startIdx);
  if (formCardIdx !== -1) {
     // We want to keep the formCard but replace everything AFTER formCard until TIERS MANAGEMENT
     const endOfFormCard = content.indexOf("</View>", content.indexOf("</View>", formCardIdx) + 50) + 7; // rough approximation, it's safer to use regex
  }
}

// Safer approach: use regex to replace the sections
