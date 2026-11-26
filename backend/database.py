'''
Function:
    - connects to the database
    - Manages the database with functions to insert, delete, getData
'''
import os
import psycopg2

from psycopg2 import sql

class DBManager:
    def __init__(self, connection=None):
        # condition to allow unit testing
        if connection is not None:
            self.connect = connection
        else:
        #  connect to SQL databse
            self.connect = psycopg2.connect(
                host = os.getenv("DB_HOST", "db"),
                port = os.getenv("DB_PORT", "5432"),
                database = os.getenv("POSTGRES_DB"),
                user = os.getenv("POSTGRES_USER"),
                password = os.getenv("POSTGRES_PASSWORD")
            )
        # cursor for executing database commands
        self.cursor = self.connect.cursor()
    
    '''
        Function to insert data into database table
        Parameters:
            table is the name of the table (accounts, groups, meetings, etc) as a string
            data is a dictionary containing column names and values in the form "column":"value"
    '''
    def insert(self, table, data):
        # taking the table attributes as col and the values as a list
        cols = data.keys()
        values = list(data.values())

        # Formatting for inserting using an SQL insert statement
        query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
            sql.Identifier(table),
            sql.SQL(", ").join(map(sql.Identifier, cols)),
            sql.SQL(", ").join(sql.Placeholder() * len(values))
        )

        # Attempting to insert into the specified table
        try:
            self.cursor.execute(query, values)
            self.connect.commit()
        # Error message if insertion fails
        except psycopg2.Error as e:
            self.connect.rollback()
            # NOTE: only print the column names, not the values, so passwords/hashes never end up in the logs
            print(f"Database insertion failed! Table: {table} Columns: {list(cols)} Error:{e}")
            raise

    '''
        Function to update data into database table
        Parameters:
            table is the name of the table (accounts, groups, meetings, etc) as a string
            data is a dictionary containing column names and values in the form "column":"value" that will contain the new values
            pk is a dictionary containing the primary key of the query from the table, ex. for accounts: "student_id":"A001"
    '''
    def update(self, table, data, pk):
        # Check if there is one and only one primary key listed
        if len(pk) != 1:
            raise ValueError("Exactly one primary key is required.")
        # taking the table attributes as col and the values as a list
        cols = data.keys()
        values = list(data.values())
        primary_key = list(pk.keys())[0]
        identifier = list(pk.values())[0]
        # Create a string for which values to change
        set_clause = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(
            sql.Identifier(col),
            sql.Placeholder())
        for col in cols
        )
        # Formatting for update using an SQL update statement
        query = sql.SQL("UPDATE {} SET {} WHERE {} = {}").format(
            sql.Identifier(table),
            set_clause,
            sql.Identifier(primary_key),
            sql.Placeholder()
        )

        # Attempting to update the specified table
        try:
            self.cursor.execute(query, values + [identifier])
            self.connect.commit()
        except psycopg2.Error as e:
            self.connect.rollback()
            print(f"Database update failed! Table: {table} Columns: {list(cols)} Error: {e}")
            raise

    '''
    Function to access/get info from database
    Parameters:
        table is the name of the table (accounts, groups, meetings, etc) as a string
        column is the column/attribute that is to be queried from (f_name, student_id, ethnicity)
        value is the value to be queried ("Josh", "F1235", "hispanic")
    Returns:
        list of tuples in the form [(F1235, "Josh", "Lopez", ...)] <-- just an example, not actual format for tables
    '''
    def getData(self, table, column, value):
        # taking the table attributes as col and the values as a list
        query = sql.SQL("SELECT * FROM {} WHERE {} = %s").format(
        sql.Identifier(table),
        sql.Identifier(column)
        )
        self.cursor.execute(query, (value,))
        return self.cursor.fetchall()

    '''
    Function to get rows, optionally filtered and sorted
    Parameters:
        table is the name of the table as a string
        filters is an optional dictionary like {"acc_role": "staff"}; every pair must match (AND)
        order_by is an optional list of column names to sort by, like ["last_name", "first_name"]
    Returns:
        list of dictionaries, one per row, like [{"student_id": "A001", "first_name": "John", ...}]
    '''
    def getRows(self, table, filters=None, order_by=None):
        query = sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))
        values = []

        # add "WHERE col1 = %s AND col2 = %s" only if filters were given
        if filters:
            conditions = sql.SQL(" AND ").join(
                sql.SQL("{} = {}").format(sql.Identifier(col), sql.Placeholder())
                for col in filters
            )
            query = query + sql.SQL(" WHERE ") + conditions
            values = list(filters.values())

        # add "ORDER BY col1, col2" only if a sort order was given
        if order_by:
            query = query + sql.SQL(" ORDER BY ") + sql.SQL(", ").join(
                map(sql.Identifier, order_by)
            )

        try:
            self.cursor.execute(query, values)
            # cursor.description holds the column names, in the same order as each row's values
            columns = [col.name for col in self.cursor.description]
            # zip pairs each column name with its value, dict() turns the pairs into a dictionary
            return [dict(zip(columns, row)) for row in self.cursor.fetchall()]
        except psycopg2.Error:
            # undo the failed command so the connection is usable again
            self.connect.rollback()
            raise

    # closes the cursor and the connection when we are done with the database
    def close(self):
        self.cursor.close()
        self.connect.close()


# FastAPI "dependency": gives each request its own database connection
def get_db():
    db = DBManager()
    try:
        yield db
    finally:
        db.close()
