import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSocketStore } from '@/store/useSocketStore';

interface OrderStatusTrackerProps {
  orderId: string;
}

const ORDER_STATUSES = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DRIVER_ASSIGNED: 'Driver Assigned',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function OrderStatusTracker({ orderId }: OrderStatusTrackerProps) {
  const { currentOrderId, orderStatus, assignedDriver, driverLocation } = useSocketStore();
  const [displayStatus, setDisplayStatus] = useState<string>('PENDING');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const isCurrentOrder = currentOrderId === orderId;

  const status = orderStatus || 'PENDING';
  const statusDisplay = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || status;

  useEffect(() => {
    if (!isCurrentOrder) {
      return;
    }

    if (status !== displayStatus) {
      setDisplayStatus(status);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [displayStatus, isCurrentOrder, status]);

  if (!isCurrentOrder) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Order Status</Text>
      <Text style={styles.status}>{statusDisplay}</Text>

      {assignedDriver && (
        <View style={styles.driverInfo}>
          <Text style={styles.driverLabel}>Driver Assigned</Text>
          <Text style={styles.driverText}>{assignedDriver.name}</Text>
          <Text style={styles.driverText}>{assignedDriver.vehiclePlate}</Text>
        </View>
      )}

      {driverLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>Location</Text>
          <Text style={styles.locationText}>Lat: {driverLocation.lat.toFixed(4)}</Text>
          <Text style={styles.locationText}>Lng: {driverLocation.lng.toFixed(4)}</Text>
        </View>
      )}

      {lastUpdate ? <Text style={styles.timestamp}>Updated: {lastUpdate}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  driverInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  driverLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  driverText: {
    fontSize: 14,
    color: '#333',
  },
  locationInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
});
