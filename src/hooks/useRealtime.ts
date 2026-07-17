import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { User, Classroom } from '../types';

export function useRealtime(
  user: User | null,
  classrooms: Classroom[] = []
) {
  useEffect(() => {
    if (!user) {
      if (socket.connected) {
        console.log('[useRealtime] Disconnecting socket on logout');
        socket.disconnect();
      }
      return;
    }

    // 1. Connect Socket.IO immediately after login
    if (!socket.connected) {
      console.log('[useRealtime] Connecting socket for user:', user.name);
      socket.connect();
    }

    // Helper to register rooms
    const registerRooms = () => {
      console.log('[useRealtime] Registering user room:', user.id);
      socket.emit('join_user_room', user.id);

      if (classrooms && classrooms.length > 0) {
        classrooms.forEach((cls) => {
          if (cls && cls.id) {
            console.log('[useRealtime] Registering classroom room:', cls.id);
            socket.emit('join_classroom', cls.id);
          }
        });
      }
    };

    // 2. Join the correct rooms on connection
    if (socket.connected) {
      registerRooms();
    }

    const onConnect = () => {
      console.log('[useRealtime] Socket connected, registering rooms');
      registerRooms();
    };

    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
    };
  }, [user, classrooms]);
}
