import type { NextApiRequest, NextApiResponse } from 'next'
import { Server as IOServer } from 'socket.io'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (res.socket.server.io) {
        res.end()
        return
    }

    const io = new IOServer(res.socket.server as any, {
        path: '/api/socketio',
        addTrailingSlash: false,
    })

    // default namespace
    io.on('connection', (socket) => {
        socket.onAny((event, ...args) => {
            // noop logging hook if desired
        })
    })

    // user-input namespace
    const userInput = io.of('/user-input')
    userInput.on('connection', (socket) => {
        socket.on('user_response', (payload) => {
            // broadcast to all operators; tool handler will also listen via IO directly
            userInput.emit('user_response', payload)
        })
    })

        ; (res.socket.server as any).io = io
        ; (globalThis as any).io = io
    res.end()
}


