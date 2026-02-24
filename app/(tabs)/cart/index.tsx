import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/store/useCartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';

export default function CartScreen() {
    const router = useRouter();
    const { items, updateQuantity, clearCart, totalAmount, restaurantId } = useCartStore();
    const createOrderMutation = useCreateOrder();

    const handleCheckout = () => {
        if (!restaurantId || items.length === 0) {
            Alert.alert("Error", "Your cart is empty");
            return;
        }

        const payload = {
            restaurantId: restaurantId,
            items: items.map(item => ({
                menuItemId: item.id,
                quantity: item.quantity
            })),
            paymentMode: "COD" as const
        };

        createOrderMutation.mutate(payload, {
            onSuccess: (order) => {
                Alert.alert(
                    "Success!",
                    "Your order has been placed successfully.",
                    [
                        {
                            text: "View Orders",
                            onPress: () => {
                                clearCart();
                                // Assuming we have a my-orders screen or similar
                                router.replace('/(tabs)');
                            }
                        },
                        {
                            text: "Dismiss",
                            onPress: () => clearCart()
                        }
                    ]
                );
            },
            onError: (error) => {
                Alert.alert("Ordering Failed", "Something went wrong while placing your order.");
            }
        });
    };

    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={80} color={Colors.muted} />
                <Text style={styles.emptyText}>Your cart is empty</Text>
                <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={styles.browseButtonText}>Browse Restaurants</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPrice}>₹{item.price}</Text>
                        </View>

                        <View style={styles.quantityContainer}>
                            <TouchableOpacity
                                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                                style={styles.qtyButton}
                            >
                                <Ionicons name="remove" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <TouchableOpacity
                                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                                style={styles.qtyButton}
                            >
                                <Ionicons name="add" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₹{totalAmount}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.checkoutButton, createOrderMutation.isPending && styles.disabledButton]}
                    onPress={handleCheckout}
                    disabled={createOrderMutation.isPending}
                >
                    {createOrderMutation.isPending ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <>
                            <Text style={styles.checkoutText}>Place Order</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    listContent: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    itemPrice: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 4,
    },
    qtyButton: {
        padding: 4,
    },
    quantityText: {
        width: 30,
        textAlign: 'center',
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.white,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    totalLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    totalValue: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xl,
        color: Colors.primary,
    },
    checkoutButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    disabledButton: {
        opacity: 0.7,
    },
    checkoutText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: Colors.white,
    },
    emptyText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.muted,
        marginTop: 20,
        marginBottom: 30,
    },
    browseButton: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 100,
    },
    browseButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary,
    }
});