import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCurrentOrder, useOrders } from '@/hooks/useOrders';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { getPlaceholderImage } from '@/constants/images';
import { UserOrder, OrderStatus, CurrentOrder } from '@/types/orders';

const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const getStatusStyles = () => {
        switch (status) {
            case 'DELIVERED':
                return { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle' as const };
            case 'CANCELLED':
                return { bg: '#FFEBEE', text: '#C62828', icon: 'close-circle' as const };
            case 'PLACED':
                return { bg: '#E3F2FD', text: '#1565C0', icon: 'time' as const };
            case 'CONFIRMED':
                return { bg: '#FCE4EC', text: '#C2185B', icon: 'checkmark' as const };
            case 'PREPARING':
                return { bg: '#FFF3E0', text: '#EF6C00', icon: 'restaurant' as const };
            case 'OUT_FOR_DELIVERY':
                return { bg: '#E0F2F1', text: '#00796B', icon: 'bicycle' as const };
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

const CurrentOrderCard = ({ order, onPress }: { order: CurrentOrder | undefined; onPress: () => void }) => {
    if (!order) return null;

    const date = new Date(order.placedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <TouchableOpacity style={uiStyles.currentOrderCard} onPress={onPress} activeOpacity={0.7}>
            <View style={uiStyles.currentOrderHeader}>
                <View style={uiStyles.currentOrderBadge}>
                    <Ionicons name="flash" size={16} color={Colors.white} />
                    <Text style={uiStyles.currentOrderBadgeText}>Active Order</Text>
                </View>
                <StatusBadge status={order.status} />
            </View>

            <View style={uiStyles.currentOrderContent}>
                <View style={uiStyles.currentOrderInfo}>
                    <View style={uiStyles.currentOrderImgWrapper}>
                        <Image
                            source={{ uri: order.restaurant.image ?? getPlaceholderImage(order.restaurantId) }}
                            style={uiStyles.currentOrderImg}
                        />
                    </View>
                    <View style={uiStyles.currentOrderDetails}>
                        <Text style={uiStyles.currentOrderResName}>{order.restaurant.name}</Text>
                        <Text style={uiStyles.currentOrderAddress} numberOfLines={1}>
                            {order.restaurant.address}
                        </Text>
                        <Text style={uiStyles.currentOrderDate}>{date} • {order.items.length} items</Text>
                    </View>
                </View>

                <View style={uiStyles.currentOrderBreakdown}>
                    <View style={uiStyles.breakdownRow}>
                        <Text style={uiStyles.breakdownLabel}>Item Total</Text>
                        <Text style={uiStyles.breakdownValue}>₹{order.itemTotal}</Text>
                    </View>
                    {order.deliveryCharge > 0 && (
                        <View style={uiStyles.breakdownRow}>
                            <Text style={uiStyles.breakdownLabel}>Delivery</Text>
                            <Text style={uiStyles.breakdownValue}>₹{order.deliveryCharge}</Text>
                        </View>
                    )}
                    <View style={uiStyles.breakdownDivider} />
                    <View style={uiStyles.breakdownRow}>
                        <Text style={uiStyles.breakdownTotal}>Total Amount</Text>
                        <Text style={uiStyles.breakdownTotalAmount}>₹{order.totalAmount}</Text>
                    </View>
                </View>

                {order.driver && (
                    <View style={uiStyles.driverInfo}>
                        <Ionicons name="person-circle" size={40} color={Colors.primary} />
                        <View style={uiStyles.driverDetails}>
                            <Text style={uiStyles.driverName}>{order.driver.name}</Text>
                            <Text style={uiStyles.driverPhone}>{order.driver.phone}</Text>
                        </View>
                        <TouchableOpacity style={uiStyles.callBtn}>
                            <Ionicons name="call" size={18} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={uiStyles.viewDetailsBtn} onPress={onPress}>
                    <Text style={uiStyles.viewDetailsBtnText}>Track Order</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const PastOrderItem = ({ item }: { item: UserOrder }) => {
    const date = new Date(item.placedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <TouchableOpacity
            style={uiStyles.card}
            activeOpacity={0.7}
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
                        <Text style={uiStyles.resName}>{item.restaurant.name.slice(0, 25)}</Text>
                        <Text style={uiStyles.orderDate}>{date}</Text>
                    </View>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <View style={uiStyles.divider} />

            <View style={uiStyles.itemsList}>
                {item.items.slice(0, 2).map((orderItem) => (
                    <Text key={orderItem.id} style={uiStyles.itemText}>
                        {orderItem.quantity} x {orderItem.menuItem.name}
                    </Text>
                ))}
                {item.items.length > 2 && (
                    <Text style={uiStyles.moreItems}>+{item.items.length - 2} more items</Text>
                )}
            </View>

            <View style={uiStyles.cardFooter}>
                <Text style={uiStyles.totalLabel}>Total Paid</Text>
                <Text style={uiStyles.totalAmount}>₹{item.totalAmount}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default function OrderHistoryScreen() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [allOrders, setAllOrders] = useState<UserOrder[]>([]);

    const { data: currentOrder, isLoading: currentLoading } = useCurrentOrder();
    const { data: ordersData, isLoading: historyLoading, refetch } = useOrders(page, limit);

    const meta = ordersData?.meta;

    // Accumulate orders when page changes
    React.useEffect(() => {
        if (ordersData?.data) {
            if (page === 1) {
                setAllOrders(ordersData.data);
            } else {
                setAllOrders(prev => [...prev, ...ordersData.data]);
            }
        }
    }, [ordersData]);

    const isLoading = currentLoading || (historyLoading && page === 1);

    if (isLoading) {
        return (
            <View style={uiStyles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!currentOrder && allOrders.length === 0) {
        return (
            <View style={uiStyles.centerContainer}>
                <Ionicons name="receipt-outline" size={80} color={Colors.light} />
                <Text style={uiStyles.emptyTitle}>No orders yet</Text>
                <Text style={uiStyles.emptySubtitle}>When you place an order, it will appear here.</Text>
                
                {/* Pagination visible even when no orders */}
                {meta && meta.totalPages > 1 && (
                    <View style={uiStyles.paginationBubbles}>
                        {/* Previous Arrow */}
                        <TouchableOpacity
                            onPress={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1 || historyLoading}
                            style={[uiStyles.arrowButton, { opacity: page === 1 ? 0.3 : 1 }]}
                        >
                            <Ionicons 
                                name="chevron-back" 
                                size={18} 
                                color={page === 1 ? Colors.muted : Colors.primary} 
                            />
                        </TouchableOpacity>

                        {/* Page Bubbles */}
                        {Array.from({ length: meta.totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            const isActive = pageNum === page;
                            return (
                                <TouchableOpacity
                                    key={`pagination-bubble-${pageNum}`}
                                    onPress={() => {
                                        setPage(pageNum);
                                        setAllOrders([]); // Reset orders when changing page
                                    }}
                                    disabled={historyLoading}
                                    style={[
                                        uiStyles.bubbleButton,
                                        {
                                            backgroundColor: isActive ? Colors.primary : Colors.surface,
                                            borderColor: isActive ? Colors.primary : Colors.border,
                                            opacity: historyLoading ? 0.6 : 1,
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        uiStyles.bubbleText,
                                        { color: isActive ? Colors.white : Colors.text }
                                    ]}>
                                        {pageNum}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Next Arrow */}
                        <TouchableOpacity
                            onPress={() => setPage(Math.min(meta.totalPages, page + 1))}
                            disabled={page >= meta.totalPages || historyLoading}
                            style={[uiStyles.arrowButton, { opacity: page >= meta.totalPages ? 0.3 : 1 }]}
                        >
                            <Ionicons 
                                name="chevron-forward" 
                                size={18} 
                                color={page >= meta.totalPages ? Colors.muted : Colors.primary} 
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={uiStyles.container}>
            <FlatList
                ListHeaderComponent={
                    <>
                        {currentOrder && (
                            <>
                                <View style={uiStyles.sectionHeader}>
                                    <Ionicons name="flash" size={20} color={Colors.primary} />
                                    <Text style={uiStyles.sectionTitle}>Current Order</Text>
                                </View>
                                <CurrentOrderCard
                                    order={currentOrder}
                                    onPress={() => router.push(`/(tabs)/orders/${currentOrder.id}`)}
                                />
                            </>
                        )}
                        {allOrders.length > 0 && (
                            <View style={uiStyles.sectionHeader}>
                                <Ionicons name="bag-outline" size={20} color={Colors.primary} />
                                <Text style={uiStyles.sectionTitle}>Past Orders</Text>
                            </View>
                        )}
                    </>
                }
                data={allOrders}
                keyExtractor={(item, index) => `${item.id}-${item.placedAt}-${index}`}
                renderItem={({ item }) => <PastOrderItem item={item} />}
                contentContainerStyle={uiStyles.listContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={currentLoading || (historyLoading && page === 1)} 
                        onRefresh={() => {
                            setPage(1);
                            setAllOrders([]);
                            refetch();
                        }}
                        tintColor={Colors.primary} 
                    />
                }
                ListFooterComponent={
                    meta && meta.totalPages > 1 ? (
                        <View style={uiStyles.paginationBubbles}>
                            {/* Previous Arrow */}
                            <TouchableOpacity
                                onPress={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1 || historyLoading}
                                style={[uiStyles.arrowButton, { opacity: page === 1 ? 0.3 : 1 }]}
                            >
                                <Ionicons 
                                    name="chevron-back" 
                                    size={18} 
                                    color={page === 1 ? Colors.muted : Colors.primary} 
                                />
                            </TouchableOpacity>

                            {/* Page Bubbles */}
                            {Array.from({ length: meta.totalPages }).map((_, idx) => {
                                const pageNum = idx + 1;
                                const isActive = pageNum === page;
                                return (
                                    <TouchableOpacity
                                    key={`pagination-bubble-empty-${pageNum}`}
                                            uiStyles.bubbleButton,
                                            {
                                                backgroundColor: isActive ? Colors.primary : Colors.surface,
                                                borderColor: isActive ? Colors.primary : Colors.border,
                                                opacity: historyLoading ? 0.6 : 1,
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            uiStyles.bubbleText,
                                            { color: isActive ? Colors.white : Colors.text }
                                        ]}>
                                            {pageNum}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Next Arrow */}
                            <TouchableOpacity
                                onPress={() => setPage(Math.min(meta.totalPages, page + 1))}
                                disabled={page >= meta.totalPages || historyLoading}
                                style={[uiStyles.arrowButton, { opacity: page >= meta.totalPages ? 0.3 : 1 }]}
                            >
                                <Ionicons 
                                    name="chevron-forward" 
                                    size={18} 
                                    color={page >= meta.totalPages ? Colors.muted : Colors.primary} 
                                />
                            </TouchableOpacity>
                        </View>
                    ) : null
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: Colors.white,
    },
    listContent: {
        padding: 16,
        paddingBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    // Current Order Card
    currentOrderCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: Colors.primary,
        overflow: 'hidden',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    currentOrderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    currentOrderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    currentOrderBadgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.white,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    currentOrderContent: {
        padding: 16,
        gap: 14,
    },
    currentOrderInfo: {
        flexDirection: 'row',
        gap: 12,
    },
    currentOrderImgWrapper: {
        width: 60,
        height: 60,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: Colors.light,
    },
    currentOrderImg: {
        width: '100%',
        height: '100%',
    },
    currentOrderDetails: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    currentOrderResName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    currentOrderAddress: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    currentOrderDate: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    currentOrderBreakdown: {
        backgroundColor: Colors.light,
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    breakdownValue: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 4,
    },
    breakdownTotal: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    breakdownTotalAmount: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.md,
        color: Colors.primary,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: Colors.primaryLight,
        borderRadius: 12,
        padding: 12,
    },
    driverDetails: {
        flex: 1,
        gap: 2,
    },
    driverName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    driverPhone: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    callBtn: {
        backgroundColor: Colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    viewDetailsBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    // Past Order Card
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
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
        marginBottom: 3,
    },
    moreItems: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
        marginTop: 4,
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
    // Pagination Bubbles
    paginationBubbles: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexWrap: 'wrap',
    },
    arrowButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: Colors.surface,
    },
    bubbleButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubbleText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
});