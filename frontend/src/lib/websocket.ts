// WebSocket Service for real-time pipeline updates

import { getWebSocketUrl, JobStatus } from './api';

export type WebSocketCallback = (status: JobStatus) => void;
export type WebSocketErrorCallback = (error: string) => void;

interface WebSocketConnection {
    ws: WebSocket;
    jobId: string;
}

class WebSocketManager {
    private connections: Map<string, WebSocketConnection> = new Map();
    private callbacks: Map<string, WebSocketCallback[]> = new Map();
    private errorCallbacks: Map<string, WebSocketErrorCallback[]> = new Map();
    private reconnectAttempts: Map<string, number> = new Map();
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    /**
     * Connect to WebSocket for a specific job
     */
    connect(
        jobId: string, 
        onStatus: WebSocketCallback, 
        onError?: WebSocketErrorCallback
    ): void {
        // Store callbacks
        if (!this.callbacks.has(jobId)) {
            this.callbacks.set(jobId, []);
        }
        this.callbacks.get(jobId)!.push(onStatus);

        if (onError) {
            if (!this.errorCallbacks.has(jobId)) {
                this.errorCallbacks.set(jobId, []);
            }
            this.errorCallbacks.get(jobId)!.push(onError);
        }

        // Check if already connected
        if (this.connections.has(jobId)) {
            return;
        }

        this.createConnection(jobId);
    }

    private createConnection(jobId: string): void {
        const url = getWebSocketUrl(jobId);
        console.log(`[WebSocket] Connecting to ${url}`);

        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log(`[WebSocket] Connected for job: ${jobId}`);
            this.reconnectAttempts.set(jobId, 0);
        };

        ws.onmessage = (event) => {
            try {
                const status: JobStatus = JSON.parse(event.data);
                console.log(`[WebSocket] Status update for ${jobId}:`, status);

                // Notify all callbacks for this job
                const callbacks = this.callbacks.get(jobId) || [];
                callbacks.forEach(cb => cb(status));

                // If job is complete or failed, clean up
                if (status.status === 'completed' || status.status === 'failed') {
                    this.cleanup(jobId);
                }
            } catch (error) {
                console.error(`[WebSocket] Error parsing message:`, error);
            }
        };

        ws.onerror = (event) => {
            console.error(`[WebSocket] Error for job ${jobId}:`, event);
            const errorCallbacks = this.errorCallbacks.get(jobId) || [];
            errorCallbacks.forEach(cb => cb('WebSocket connection error'));
        };

        ws.onclose = (event) => {
            console.log(`[WebSocket] Closed for job ${jobId}:`, event.code, event.reason);
            this.connections.delete(jobId);

            // Attempt reconnect if not a normal close
            if (event.code !== 1000) {
                this.attemptReconnect(jobId);
            }
        };

        this.connections.set(jobId, { ws, jobId });
    }

    private attemptReconnect(jobId: string): void {
        const attempts = this.reconnectAttempts.get(jobId) || 0;

        if (attempts < this.maxReconnectAttempts) {
            this.reconnectAttempts.set(jobId, attempts + 1);
            console.log(`[WebSocket] Reconnecting (${attempts + 1}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                if (!this.connections.has(jobId)) {
                    this.createConnection(jobId);
                }
            }, this.reconnectDelay * Math.pow(2, attempts));
        } else {
            console.error(`[WebSocket] Max reconnect attempts reached for job ${jobId}`);
            const errorCallbacks = this.errorCallbacks.get(jobId) || [];
            errorCallbacks.forEach(cb => cb('Connection lost. Max reconnect attempts reached.'));
            this.cleanup(jobId);
        }
    }

    /**
     * Disconnect from a specific job's WebSocket
     */
    disconnect(jobId: string): void {
        const connection = this.connections.get(jobId);
        if (connection) {
            connection.ws.close(1000, 'Client disconnect');
            this.cleanup(jobId);
        }
    }

    /**
     * Disconnect from all WebSockets
     */
    disconnectAll(): void {
        this.connections.forEach((connection, jobId) => {
            connection.ws.close(1000, 'Client disconnect');
            this.cleanup(jobId);
        });
    }

    private cleanup(jobId: string): void {
        this.connections.delete(jobId);
        this.callbacks.delete(jobId);
        this.errorCallbacks.delete(jobId);
        this.reconnectAttempts.delete(jobId);
    }

    /**
     * Check if connected to a job
     */
    isConnected(jobId: string): boolean {
        const connection = this.connections.get(jobId);
        return connection?.ws.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const wsManager = new WebSocketManager();
