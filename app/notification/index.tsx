import React, { useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { Notification } from '@/types/notifications';
import { useRouter, useNavigation } from 'expo-router';


function getTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

export default function NotificationScreen() {
    const { Colors, isDark } = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

    const {
        data: paginatedData,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useNotifications();

    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();

    const notifications = useMemo(() => 
        paginatedData?.pages.flatMap(page => page.data) ?? [], 
    [paginatedData]);

    const unreadCount = paginatedData?.pages[0]?.unreadCount ?? 0;

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => unreadCount > 0 ? (
                <TouchableOpacity 
                    onPress={() => markAllAsRead.mutate()} 
                    style={styles.headerBtn}
                >
                    <Text style={styles.headerBtnText}>Mark all as read</Text>
                </TouchableOpacity>
            ) : null,
        });
    }, [unreadCount, navigation, styles]);

    const handleNotificationPress = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead.mutate(notification.id);
        }

        if (notification.data?.orderId) {
            router.push(`/(tabs)/orders/${notification.data.orderId}`);
        }
    };

    const renderItem = ({ item, index }: { item: Notification, index: number }) => {
        const isOrderUpdate = item.type === 'ORDER_UPDATE';
        
        return (
            <Animated.View entering={FadeInRight.delay(index * 50).springify().damping(20)}>
                <AnimatedPressable 
                    style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                    onPress={() => handleNotificationPress(item)}
                    scaleIn={0.98}
                >
                    <View style={[styles.iconContainer, { backgroundColor: isOrderUpdate ? Colors.primary + '15' : Colors.border + '30' }]}>
                        <MaterialCommunityIcons 
                            name={isOrderUpdate ? "package-variant-closed" : "bell-outline"} 
                            size={24} 
                            color={isOrderUpdate ? Colors.primary : Colors.muted} 
                        />
                    </View>

                    <View style={styles.contentContainer}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, !item.isRead && styles.unreadText]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            {!item.isRead && <View style={styles.unreadDot} />}
                        </View>
                        
                        <Text style={styles.body} numberOfLines={2}>
                            {item.body}
                        </Text>
                        
                        <Text style={styles.timeAgo}>
                            {getTimeAgo(item.createdAt)}
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={Colors.border} />
                </AnimatedPressable>
            </Animated.View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                onEndReached={() => {
                    if (hasNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl 
                        refreshing={false} 
                        onRefresh={refetch} 
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="notifications-off-outline" size={64} color={Colors.border} />
                        </View>
                        <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            We'll notify you when something important happens.
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                        </View>
                    ) : <View style={{ height: 40 }} />
                }
            />
        </View>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
        flexGrow: 1,
    },
    headerBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    unreadCard: {
        borderColor: Colors.primary + '40',
        backgroundColor: isDark ? Colors.surface : Colors.primary + '05',
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        marginLeft: 14,
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        flex: 1,
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    unreadText: {
        color: isDark ? Colors.primary : Colors.text,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginLeft: 8,
    },
    body: {
        fontFamily: Fonts.brand,
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 6,
    },
    timeAgo: {
        fontFamily: Fonts.brandMedium,
        fontSize: 10,
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footerLoader: {
        paddingVertical: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconWrap: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 22,
    },
});
