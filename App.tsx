import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const OrderListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [serverIP, setServerIP] = useState('192.168.1.61');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem('orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
    }
  };

  const saveOrders = async (newOrders) => {
    try {
      await AsyncStorage.setItem('orders', JSON.stringify(newOrders));
    } catch (error) {
      console.error("Lỗi khi lưu đơn hàng:", error);
    }
  };

  const addOrder = async (newOrder) => {
    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    await saveOrders(updatedOrders);
  };

  const removeOrder = async () => {
    if (selectedIndex === null) {
      Alert.alert("Thông báo", "Vui lòng chọn đơn hàng trước khi xuất.");
      return;
    }
  
    let updatedOrders = [...orders];
    updatedOrders[selectedIndex] = { ...updatedOrders[selectedIndex], status: "Xuất" };
    setOrders(updatedOrders);
  
    const selectedOrder = updatedOrders[selectedIndex];
  
    try {
      const response = await fetch(`http://${serverIP}:5000/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedOrder)
      });
  
      if (!response.ok) {
        Alert.alert("Lỗi", "Gửi dữ liệu lên server thất bại.");
        return;
      }
  
      const googleSheetUrl = "https://script.google.com/macros/s/AKfycbxx7pUrgRaqpRI_9iZjJRYlSzigyAaYIpptOtTP0AiKjosPhs-whOL9hvIWy_FkUkEx/exec";
      const sheetResponse = await fetch(googleSheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedOrder)
      });
  
      if (!sheetResponse.ok) {
        Alert.alert("Lỗi", "Gửi dữ liệu lên Google Sheets thất bại.");
        return;
      }
  
      Alert.alert("Thành công", "Đã gửi dữ liệu lên server và Google Sheets.");
      updatedOrders = updatedOrders.filter((_, i) => i !== selectedIndex);
      setOrders(updatedOrders);
      await saveOrders(updatedOrders);
      setSelectedIndex(null);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể kết nối đến server hoặc Google Sheets.");
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh sách đơn hàng</Text>
      <TextInput
        style={styles.input}
        placeholder="Nhập địa chỉ IP server"
        value={serverIP}
        onChangeText={setServerIP}
      />
      <FlatList
        data={orders}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.orderItem, selectedIndex === index && styles.selectedItem]}
            onPress={() => setSelectedIndex(index)}
          >
            <Text><Text style={styles.bold}>Tên hàng:</Text> {item.name}</Text>
            <Text><Text style={styles.bold}>Người gửi:</Text> {item.sender}</Text>
            <Text><Text style={styles.bold}>Thời gian nhận:</Text> {item.time}</Text>
            <Text><Text style={styles.bold}>Vị trí:</Text> {`Khu ${item.zone}, Kệ ${item.shelf}, Vị trí ${item.position}`}</Text>
            <Text><Text style={styles.bold}>Trạng thái:</Text> {item.status}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={styles.buttonContainer}>
        <Button title="Thêm đơn hàng" onPress={() => navigation.navigate('AddOrder', { addOrder, serverIP })} />
        <Button title="Xuất hàng" color="#dc3545" onPress={removeOrder} />
      </View>
    </View>
  );
};

const AddOrderScreen = ({ route, navigation }) => {
  const { addOrder, serverIP } = route.params;

  const [name, setName] = useState('');
  const [sender, setSender] = useState('');
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('Nhập'); // Mặc định là "Nhập"

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleString();
  };

  const handleAddOrder = async () => {
    if (name && sender && zone && shelf && position) {
      const newOrder = {
        name,
        sender,
        time: getCurrentTime(),
        zone,
        shelf,
        position,
        status
      };

      addOrder(newOrder);

      try {
        const response = await fetch(`http://${serverIP}:5000/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newOrder)
        });

        const result = await response.json();

        if (!response.ok) {
          Alert.alert("Lỗi", "Gửi dữ liệu lên server thất bại: " + result.message);
          return;
        }

        Alert.alert("Thành công", "Dữ liệu đã được gửi lên server.");
      } catch (error) {
        Alert.alert("Lỗi", "Không thể kết nối đến server.");
      }

      navigation.goBack();
    } else {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhập thông tin đơn hàng</Text>
      <TextInput style={styles.input} placeholder="Tên hàng" placeholderTextColor="#6c757d" onChangeText={setName} value={name} />
      <TextInput style={styles.input} placeholder="Người gửi" placeholderTextColor="#6c757d" onChangeText={setSender} value={sender} />

      <Text style={styles.subtitle}>Vị trí lưu kho:</Text>
      <TextInput style={styles.input} placeholder="Khu" placeholderTextColor="#6c757d" onChangeText={setZone} value={zone} />
      <TextInput style={styles.input} placeholder="Kệ số" placeholderTextColor="#6c757d" keyboardType="numeric" onChangeText={setShelf} value={shelf} />
      <TextInput style={styles.input} placeholder="Vị trí" placeholderTextColor="#6c757d" keyboardType="numeric" onChangeText={setPosition} value={position} />

      <Button title="Lưu đơn hàng" onPress={handleAddOrder} />
    </View>
  );
};


const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'Quản lý đơn hàng' }} />
        <Stack.Screen name="AddOrder" component={AddOrderScreen} options={{ title: 'Thêm đơn hàng' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, color: '#007bff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10, backgroundColor: '#fff' },
  orderItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  selectedItem: { backgroundColor: '#d4edda' }, // Đơn hàng được chọn sẽ có màu xanh nhạt
  bold: { fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
});

export default App;
