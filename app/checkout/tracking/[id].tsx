import { useEffect, useMemo, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useOrderDetail } from '@/hooks/useOrders';
import { useSocketStore } from '@/store/useSocketStore';
import { getSocket } from '@/lib/socket-client';
import { useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@/types/orders';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  
  const { data: order, isLoading } = useOrderDetail(id as string);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const { isConnected } = useSocketStore();

  const restaurantPos = useMemo(() => {
    if (!order?.restaurant) return null;
    return { latitude: order.restaurant.lat, longitude: order.restaurant.lng };
  }, [order?.restaurant]);

  const customerPos = useMemo(() => {
    if (!order?.customerAddress) return null;
    return { latitude: order.customerAddress.lat, longitude: order.customerAddress.lng };
  }, [order?.customerAddress]);

  const driverPos = useMemo(() => {
    if (driverLocation) return { latitude: driverLocation.lat, longitude: driverLocation.lng };
    return null;
  }, [driverLocation]);

  // Fit map to markers whenever positions change
  useEffect(() => {
    if (mapRef.current && (restaurantPos || customerPos || driverPos)) {
      const markers = [restaurantPos, customerPos, driverPos].filter(Boolean) as { latitude: number, longitude: number }[];
      if (markers.length > 0) {
        mapRef.current.fitToCoordinates(markers, {
          edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
          animated: true,
        });
      }
    }
  }, [restaurantPos, customerPos, driverPos]);

  useEffect(() => {
    if (!id) return;
    
    const socket = getSocket();
    if (!socket) return;

    const handleLocationUpdate = (payload: any) => {
      if (payload.orderId === id) {
        setDriverLocation({ lat: payload.lat, lng: payload.lng });
      }
    };

    const handleStatusUpdate = (payload: any) => {
      if (payload.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['orders', id] });
      }
    };

    const handleDriverAssigned = (payload: any) => {
      if (payload.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['orders', id] });
      }
    };

    const handleOrderCancelled = (payload: any) => {
      if (payload.orderId === id) {
        // Force immediate refresh to trigger the cancellation overlay
        queryClient.invalidateQueries({ queryKey: ['orders', id] });
      }
    };

    socket.emit('join_order_tracking', id);
    
    socket.on('order_location_update', handleLocationUpdate);
    socket.on('order_status_update', handleStatusUpdate);
    socket.on('driver_assigned', handleDriverAssigned);
    socket.on('order_cancelled', handleOrderCancelled);

    return () => {
      socket.emit('leave_order_tracking', id);
      socket.off('order_location_update', handleLocationUpdate);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('driver_assigned', handleDriverAssigned);
      socket.off('order_cancelled', handleOrderCancelled);
    };
  }, [id, queryClient]);

  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'PLACED': return 1;
      case 'ACCEPTED': return 2;
      case 'PREPARING': return 3;
      case 'READY': return 4;
      case 'ON_THE_WAY': return 5;
      case 'DELIVERED': return 6;
      default: return 1;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
      switch (status) {
          case 'PLACED': return 'Order Placed';
          case 'ACCEPTED': return 'Order Accepted';
          case 'PREPARING': return 'Preparing Food';
          case 'READY': return 'Ready for Pickup';
          case 'ON_THE_WAY': return 'Out for Delivery';
          case 'DELIVERED': return 'Delivered';
          case 'CANCELLED': return 'Order Cancelled';
          case 'REFUSED': return 'Order Refused';
          default: return status;
      }
  };

  const handleCallDriver = () => {
    if (order?.driver?.phone) {
      Linking.openURL(`tel:${order.driver.phone}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching order live tracking...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.danger} />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.headerSubtitle}>{order.restaurant.name}</Text>
        </View>
        <TouchableOpacity style={styles.headerIconButton}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={restaurantPos ? {
          ...restaurantPos,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        } : undefined}
      >
        {restaurantPos && (
          <Marker coordinate={restaurantPos} title={order.restaurant.name}>
             <View style={styles.restaurantMarker}>
                <Ionicons name="restaurant" size={18} color={Colors.white} />
             </View>
          </Marker>
        )}

        {customerPos && (
          <Marker coordinate={customerPos} title="Delivery Location">
            <View style={styles.customerMarker}>
                <Ionicons name="home" size={18} color={Colors.white} />
            </View>
          </Marker>
        )}

        {driverPos && (
          <Marker coordinate={driverPos} title="Rider">
            <View style={styles.driverMarker}>
                <MaterialCommunityIcons name="moped" size={20} color={Colors.white} />
            </View>
          </Marker>
        )}

        {restaurantPos && customerPos && (
          <Polyline
            coordinates={[restaurantPos, customerPos]}
            strokeWidth={3}
            strokeColor={Colors.primary}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Tracking Card */}
      <View style={styles.cardContainer}>
        <View style={styles.dragHandle} />
        
        <View style={styles.statusContainer}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>{getStatusLabel(order.status)}</Text>
            {order.status === 'ON_THE_WAY' && (
               <View style={styles.liveBadge}>
                 <View style={styles.liveDot} />
                 <Text style={styles.liveText}>LIVE</Text>
               </View>
            )}
          </View>
          
          <View style={styles.timelineContainer}>
             {[1, 2, 3, 4, 5, 6].map((step) => (
                <View key={step} style={styles.timelineStepContainer}>
                   <View style={[
                      styles.timelineLine,
                      step === 1 && { display: 'none' },
                      step <= currentStep ? { backgroundColor: Colors.primary } : { backgroundColor: Colors.border }
                   ]} />
                   <View style={[
                      styles.timelineDot,
                      step <= currentStep ? { backgroundColor: Colors.primary } : { borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.white }
                   ]}>
                      {step < currentStep ? (
                        <Ionicons name="checkmark" size={12} color={Colors.white} />
                      ) : step === currentStep ? (
                         <View style={styles.activeDotInner} />
                      ) : null}
                   </View>
                </View>
             ))}
          </View>
        </View>

        {/* Driver Info Section */}
        {order.driverId ? (
          <View style={styles.driverSection}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatarContainer}>
                <Image 
                  source={{ uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(order.driver?.name || 'Driver') + '&background=random' }} 
                  style={styles.driverAvatar} 
                />
                <View style={styles.ratingBadge}>
                   <Ionicons name="star" size={10} color={Colors.secondary} />
                   <Text style={styles.ratingText}>4.8</Text>
                </View>
              </View>
              <View style={styles.driverTextContainer}>
                <Text style={styles.driverName}>{order.driver?.name || 'Your Rider'}</Text>
                <Text style={styles.vehicleInfo}>Hero Splendor • MH12 AB 1234</Text>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* OTP Section */}
            {(order.status === 'READY' || order.status === 'ON_THE_WAY') && (
              <View style={styles.otpCard}>
                 <Text style={styles.otpLabel}>Delivery Verification Code</Text>
                 <View style={styles.otpValueContainer}>
                    <Text style={styles.otpValue}>{order.otp || '----'}</Text>
                 </View>
                 <Text style={styles.otpNote}>Share this OTP with your rider only at the time of delivery.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.searchingSection}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.searchingText}>Assigning a rider to your order...</Text>
          </View>
        )}

        {/* Order Items Summary */}
        <TouchableOpacity style={styles.summaryCollapse} onPress={() => Alert.alert('Order Details', 'Items: ' + order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', '))}>
           <Text style={styles.summaryText}>View Order Details</Text>
           <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Cancellation Overlay */}
      {order.status === 'CANCELLED' && (
        <View style={styles.cancelledOverlay}>
           <View style={styles.cancelledCard}>
              <Ionicons name="close-circle" size={64} color={Colors.danger} />
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledSubtitle}>
                We're sorry, but this order has been cancelled. If you have been charged, a refund will be processed automatically.
              </Text>
              <TouchableOpacity style={styles.cancelledBackButton} onPress={() => router.back()}>
                <Text style={styles.cancelledBackButtonText}>Go Back</Text>
              </TouchableOpacity>
           </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text,
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 15,
    right: 15,
    height: 70,
    backgroundColor: Colors.white,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.muted,
  },
  map: {
    flex: 1,
  },
  restaurantMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 12,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 20,
  },
  timelineStepContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineLine: {
    flex: 1,
    height: 4,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
  },
  searchingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
  },
  searchingText: {
    marginLeft: 10,
    color: Colors.muted,
    fontSize: 14,
  },
  driverSection: {
    marginBottom: 15,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverAvatarContainer: {
    position: 'relative',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: Colors.white,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
    color: Colors.text,
  },
  driverTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  vehicleInfo: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  otpLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 8,
  },
  otpValueContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  otpValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: Colors.text,
  },
  otpNote: {
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
  },
  summaryCollapse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
  },
  cancelledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    zIndex: 100,
  },
  cancelledCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  cancelledTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 15,
  },
  cancelledSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    marginBottom: 25,
  },
  cancelledBackButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelledBackButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
