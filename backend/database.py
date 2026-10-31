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
            print(f"Database insertion failed! Table: {table} Data: {data} Error:{e}")
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

    def close(self):
        self.cursor.close()
        self.connect.close()