import os
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.document_loaders.markdown import UnstructuredMarkdownLoader
from langchain.document_loaders.directory import DirectoryLoader
from langchain.vectorstores.pinecone import Pinecone
import pinecone
from dotenv import load_dotenv
import os

cwd = os.getcwd()

load_dotenv(os.path.join(cwd, '.env'))

PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')    
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME')
PINECONE_NAME_SPACE = os.getenv('PINECONE_NAME_SPACE_INGEST')
PINECONE_ENVIRONMENT = os.getenv('PINECONE_ENVIRONMENT')

# Name of directory to retrieve your files from
# Make sure to add your PDF files inside the 'docs' folder
file_path = 'docs'
print(os.path.join(cwd, file_path))

def run():
    try:
        # Load raw docs from all files in the directory
        directory_loader = DirectoryLoader(file_path, glob='*.md', loader_cls=UnstructuredMarkdownLoader, loader_kwargs={
        }, show_progress=True)

        raw_docs = directory_loader.load()

        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

        # Split the documents
        docs = text_splitter.split_documents(raw_docs)
        print('split docs:', docs)

        print('creating vector store...')
        # Create and store the embeddings in the vectorStore
        embeddings = OpenAIEmbeddings()
        pinecone.init(api_key = os.getenv(PINECONE_API_KEY), environment=PINECONE_ENVIRONMENT)
        active_indexes = pinecone.list_indexes()

        if PINECONE_INDEX_NAME not in active_indexes:
            print('creating index...')
            pinecone.create_index(PINECONE_INDEX_NAME, dimension=1536)
        else:
            print('update index...')
            index = pinecone.Index(PINECONE_INDEX_NAME)
            delete_response = index.delete(deleteAll='true', namespace=PINECONE_NAME_SPACE)
            print('delete response:', delete_response)

        # Embed the PDF documents
        Pinecone.from_documents(docs, embeddings, index_name = PINECONE_INDEX_NAME, namespace = PINECONE_NAME_SPACE, text_key = 'text')
    except Exception as error:
        print('error:', error)
        raise Exception('Failed to ingest your data')

def main():
    run()
    print('ingestion complete')

if __name__ == '__main__':
    # 调用指定函数
    main()
