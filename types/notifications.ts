export interface RegisterPushTokenRequest {
  token: string | null;
}

export interface RegisterPushTokenResponse {
  message?: string; // optional (backend may not return anything)
}


export interface UpdatePushTokenRequest {
  token: string | null; // 🔥 null = unregister
}

export interface UpdatePushTokenResponse {
  message?: string;
}

export interface NotificationData {
  status?: string;
  orderId?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data: NotificationData;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}