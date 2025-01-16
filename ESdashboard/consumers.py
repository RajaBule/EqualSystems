import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TableConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        data = json.loads(text_data)
        table_id = data['table_id']
        state = data['state']

        # Example: Send data back to WebSocket
        await self.send(text_data=json.dumps({
            'message': f'Table {table_id} updated to state {state}'
        }))
