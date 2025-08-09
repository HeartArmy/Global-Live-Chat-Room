import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { name, message, mathAnswer, mathQuestion, timestamp } = await request.json()

    // Validate required fields
    if (!name || !message || !mathAnswer || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate name length
    if (name.length < 2 || name.length > 30) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 30 characters' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length < 1 || message.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be between 1 and 1000 characters' },
        { status: 400 }
      )
    }

    // Basic anti-bot validation (you can enhance this)
    if (typeof mathAnswer !== 'number') {
      return NextResponse.json(
        { error: 'Invalid math answer' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('globalchat')
    const collection = db.collection('messages')

    // Create message document
    const messageDoc = {
      name: name.trim(),
      message: message.trim(),
      timestamp: new Date(timestamp),
      createdAt: new Date(),
      _id: new ObjectId(),
    }

    // Insert message into database
    await collection.insertOne(messageDoc)

    return NextResponse.json({ 
      success: true, 
      message: messageDoc,
      id: messageDoc._id.toString()
    })

  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('globalchat')
    const collection = db.collection('messages')

    // Get last 100 messages, sorted by timestamp
    const messages = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json({ messages: messages.reverse() })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
