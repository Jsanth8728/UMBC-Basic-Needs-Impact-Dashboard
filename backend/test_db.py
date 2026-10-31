'''
Function:
    -Stub to test the functions of inserting and getting data
    
'''

from unittest.mock import MagicMock
from database import DBManager

# Create mock connection
mock_connection = MagicMock()
mock_cursor = MagicMock()

# Make connection return mock cursor
mock_connection.cursor.return_value = mock_cursor

# Pass mock connection into DBManager
db = DBManager(mock_connection)

# Test insert()
db.insert("account", {
    "student_id": "A001",
    "first_name": "John"
})

mock_cursor.execute.assert_called_once()
print("Insert test passed!")

# Test getData()
mock_cursor.fetchall.return_value = [
    ("A001", "John")
]

result = db.getData("account", "student_id", "A001")

# Print database results
print("\nDatabase Results:")
for row in result:
    print(row)

assert result == [("A001", "John")]
print("\ngetData test passed!")