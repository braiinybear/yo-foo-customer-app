import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOrders } from '@/hooks/useOrders';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { getPlaceholderImage } from '@/constants/images';
import { UserOrder, OrderStatus } from '@/types/orders';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const getStatusStyles = () => {
        switch (status) {
            case 'DELIVERED':
                return { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle' as const };
            case 'CANCELLED':
                return { bg: '#FFEBEE', text: '#C62828', icon: 'close-circle' as const };
            case 'PLACED':
                return { bg: '#E3F2FD', text: '#1565C0', icon: 'time' as const };
            default:
                return { bg: '#FFF3E0', text: '#EF6C00', icon: 'restaurant' as const };
        }
    };

    const styles = getStatusStyles();

    return (
        <View style={[uiStyles.badgeContainer, { backgroundColor: styles.bg }]}>
            <Ionicons name={styles.icon} size={14} color={styles.text} />
            <Text style={[uiStyles.badgeText, { color: styles.text }]}>{status}</Text>
        </View>
    );
};

export default function OrderHistoryScreen() {
    const router = useRouter();
    const { data: orders, isLoading, isError, refetch } = useOrders();

    if (isLoading) {
        return (
            <View style={uiStyles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (isError || !orders) {
        return (
            <View style={uiStyles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={Colors.muted} />
                <Text style={uiStyles.errorText}>Failed to load order history</Text>
                <TouchableOpacity style={uiStyles.retryButton} onPress={() => refetch()}>
                    <Text style={uiStyles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (orders.length === 0) {
        return (
            <View style={uiStyles.centerContainer}>
                <Ionicons name="receipt-outline" size={80} color={Colors.light} />
                <Text style={uiStyles.emptyTitle}>No orders yet</Text>
                <Text style={uiStyles.emptySubtitle}>When you place an order, it will appear here.</Text>
            </View>
        );
    }

    const renderOrderItem = ({ item }: { item: UserOrder }) => {
        const date = new Date(item.placedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

        return (
            <TouchableOpacity
                style={uiStyles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/(tabs)/orders/${item.id}`)}
            >
                <View style={uiStyles.cardHeader}>
                    <View style={uiStyles.restaurantInfo}>
                        <View style={uiStyles.imgWrapper}>
                            <Image
                                source={{ uri: item.restaurant.image ?? getPlaceholderImage(item.restaurantId) }}
                                style={uiStyles.resImage}
                            />
                        </View>
                        <View>
                            <Text style={uiStyles.resName}>{item.restaurant.name}</Text>
                            <Text style={uiStyles.orderDate}>{date}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status} />
                </View>

                <View style={uiStyles.divider} />

                <View style={uiStyles.itemsList}>
                    {item.items.map((orderItem) => (
                        <Text key={orderItem.id} style={uiStyles.itemText}>
                            {orderItem.quantity} x {orderItem.menuItem.name}
                        </Text>
                    ))}
                </View>

                <View style={uiStyles.cardFooter}>
                    <Text style={uiStyles.totalLabel}>Total Paid</Text>
                    <Text style={uiStyles.totalAmount}>₹{item.totalAmount}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={uiStyles.container}>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                renderItem={renderOrderItem}
                contentContainerStyle={uiStyles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
                }
            />
        </View>
    );
}

const uiStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.white,
    },
    headerTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xl,
        color: Colors.text,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: Colors.white,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    restaurantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    imgWrapper: {
        width: 45,
        height: 45,
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: Colors.light,
    },
    resImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImg: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    orderDate: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    badgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 12,
        borderStyle: 'dashed',
    },
    itemsList: {
        marginBottom: 12,
    },
    itemText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.light,
        paddingTop: 12,
    },
    totalLabel: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    totalAmount: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    errorText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.muted,
        marginTop: 12,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.white,
    },
});