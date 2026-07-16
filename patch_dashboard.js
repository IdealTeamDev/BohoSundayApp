import fs from 'fs';

let content = fs.readFileSync('src/app/(admin)/dashboard.tsx', 'utf8');

// Replace state variables
content = content.replace("const [newProductType, setNewProductType] = useState<'ticket'|'bed'|'table'>('ticket');\n  const scrollViewRef = useRef<ScrollView>(null);",
`const [newProductType, setNewProductType] = useState<'ticket'|'bed'|'table'>('ticket');
  const [newProductZone, setNewProductZone] = useState('oasis');
  const [newProductNumber, setNewProductNumber] = useState('');
  const [newProductPersons, setNewProductPersons] = useState('10');
  const [isProductsCollapsed, setIsProductsCollapsed] = useState(true);
  const [isBedsCollapsed, setIsBedsCollapsed] = useState(true);
  const [isTablesCollapsed, setIsTablesCollapsed] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);`);

// Replace handleAddProduct
content = content.replace(/const handleAddProduct = \(\) => \{[\s\S]*?\};/, 
`const handleAddProduct = () => {
    if (newProductType === 'ticket') {
      if (newProductName.trim() && newProductPrice) {
        addProduct({
          name: newProductName, 
          type: 'ticket', 
          basePrice: parseFloat(newProductPrice) || 0
        });
        setNewProductName('');
        setNewProductPrice('');
      }
    } else {
      let pName = 'MESA';
      if (newProductType === 'bed') {
        pName = \`CAMA \${newProductZone.toUpperCase()}\`;
      } else {
        pName = \`MESA \${newProductZone.toUpperCase()}\`;
      }
      addProduct({
        name: pName,
        type: newProductType,
        basePrice: parseFloat(newProductPrice) || 0,
        zone: newProductZone,
        number: newProductNumber,
        persons: parseInt(newProductPersons, 10) || 10
      });
      setNewProductNumber('');
    }
  };`);

// Replace PRODUCT CATALOG SECTION completely
const catalogStart = content.indexOf("{/* PRODUCT CATALOG SECTION */}");
const tiersStart = content.indexOf("{/* TIERS MANAGEMENT SECTION */}");

const oldCatalog = content.substring(catalogStart, tiersStart);

const newCatalog = `
        {/* FORMULARIO DE AÑADIR */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Añadir Nuevo Producto</Text>
          <Text style={styles.sectionSubtitle}>Define precios y detalles para Entradas, Camas o Mesas.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity 
              style={[styles.typeSelectBtn, newProductType === 'ticket' && styles.typeSelectBtnActive]}
              onPress={() => setNewProductType('ticket')}
            >
              <Text style={[styles.typeSelectBtnText, newProductType === 'ticket' && styles.typeSelectBtnTextActive]}>Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeSelectBtn, newProductType === 'table' && styles.typeSelectBtnActive]}
              onPress={() => {
                setNewProductType('table');
                setNewProductZone('oasis');
              }}
            >
              <Text style={[styles.typeSelectBtnText, newProductType === 'table' && styles.typeSelectBtnTextActive]}>Mesa</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeSelectBtn, newProductType === 'bed' && styles.typeSelectBtnActive]}
              onPress={() => {
                setNewProductType('bed');
                setNewProductZone('bohemian');
              }}
            >
              <Text style={[styles.typeSelectBtnText, newProductType === 'bed' && styles.typeSelectBtnTextActive]}>Cama</Text>
            </TouchableOpacity>
          </View>

          {newProductType === 'ticket' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TextInput 
                style={[styles.input, { flex: 2, marginBottom: 0 }]} 
                placeholder="Nombre (Ej. General)" 
                value={newProductName} 
                onChangeText={setNewProductName} 
              />
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="Precio $" 
                keyboardType="numeric"
                value={newProductPrice} 
                onChangeText={setNewProductPrice} 
              />
            </View>
          ) : (
            <View>
              <Text style={[styles.label, { marginBottom: 8, color: '#1a1614' }]}>Zona *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {(newProductType === 'table' ? ['oasis', 'candela', 'backstage'] : ['bohemian', 'primitivo', 'vip']).map(zone => (
                  <TouchableOpacity 
                    key={zone}
                    style={{ 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 20, 
                      backgroundColor: newProductZone === zone ? '#1a1614' : '#f8f5f1',
                      borderWidth: 1,
                      borderColor: newProductZone === zone ? '#1a1614' : '#f0ebe1',
                    }}
                    onPress={() => setNewProductZone(zone)}
                  >
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'NunitoSans_700Bold', 
                      color: newProductZone === zone ? '#ffffff' : '#8b8378'
                    }}>
                      {zone.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginBottom: 4, color: '#1a1614' }]}>Número *</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="Ej. 1" 
                    value={newProductNumber} 
                    onChangeText={setNewProductNumber} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginBottom: 4, color: '#1a1614' }]}>Personas *</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="Ej. 10" 
                    keyboardType="numeric"
                    value={newProductPersons} 
                    onChangeText={setNewProductPersons} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginBottom: 4, color: '#1a1614' }]}>Precio $ *</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="Precio" 
                    keyboardType="numeric"
                    value={newProductPrice} 
                    onChangeText={setNewProductPrice} 
                  />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={handleAddProduct} style={[styles.submitBtn, { marginTop: 16, marginBottom: 0, padding: 16 }]}>
            <Text style={styles.submitBtnText}>Añadir {newProductType === 'ticket' ? 'Entrada' : newProductType === 'bed' ? 'Cama' : 'Mesa'}</Text>
          </TouchableOpacity>
        </View>

        {/* CATÁLOGOS COLAPSABLES */}
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
                style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 0, marginTop: 8 }]} 
                onPress={toggle}
              >
                <View>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Catálogo de {title} ({catProducts.length})</Text>
                </View>
                {isCollapsed ? <ChevronDown color="#1a1614" size={24} /> : <ChevronUp color="#1a1614" size={24} />}
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={[styles.listContainer, { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -8, paddingTop: 16 }]}>
                  {catProducts.map((p, idx) => (
                    <View key={p.id} style={[styles.listItem, idx === catProducts.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listItemName}>{p.name} {p.number ? \`#\${p.number}\` : ''}</Text>
                        <Text style={styles.listItemMeta}>{p.type.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.listItemValue}>{formatCurrency(p.basePrice)}</Text>
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

content = content.replace(oldCatalog, newCatalog);

// Also formatCOP is imported but not formatCurrency for products list. I'll use formatCurrency which is defined inside the component.
// Oh wait, formatCurrency is available. Let's make sure ChevronDown and ChevronUp are imported.
content = content.replace("Trash2, Plus, Save, X }", "Trash2, Plus, Save, X, ChevronDown, ChevronUp }");

fs.writeFileSync('src/app/(admin)/dashboard.tsx', content);
