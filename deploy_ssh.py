# d:\GITHUB_SPACE\DOMATION_FULLSTACK\deploy_ssh.py
import os
import tarfile
import subprocess
import tempfile

def deploy_archive(archive_name, source_dir, remote_dest):
    temp_dir = tempfile.gettempdir()
    archive_path = os.path.join(temp_dir, archive_name)
    
    print(f"Creating archive {archive_name} from {source_dir}...")
    try:
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(source_dir, arcname=".")
    except Exception as e:
        print(f"Error creating archive: {e}")
        return False

    print(f"Uploading and extracting to {remote_dest}...")
    ssh_cmd = [
        "ssh", "-4", "-p", "2210", 
        "-o", "StrictHostKeyChecking=no", 
        "vhvxoigh@chiefaiofficer.vn", 
        f"tar -xzf - -C {remote_dest}"
    ]
    
    try:
        with open(archive_path, "rb") as stdin_f:
            result = subprocess.run(
                ssh_cmd, 
                stdin=stdin_f, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
        
        if result.returncode == 0:
            print(f"Deployment to {remote_dest} completed successfully!")
            return True
        else:
            print(f"Deployment failed with exit code: {result.returncode}")
            if result.stderr:
                print(f"STDERR:\n{result.stderr}")
            return False
    except Exception as e:
        print(f"Error executing SSH command: {e}")
        return False
    finally:
        if os.path.exists(archive_path):
            os.remove(archive_path)

def main():
    print("=== DEPLOYING FULLSTACK (FRONTEND + BACKEND) ===")
    
    # 1. Deploy Backend (api/ -> mail_api/)
    print("\n--- 1. Deploying Backend ---")
    deploy_archive("autoflow_backend.tar.gz", "api", "/home/vhvxoigh/automation.ideas.edu.vn/mail_api/")
    
    # 2. Deploy Frontend (dist/ -> root)
    if os.path.exists("dist"):
        print("\n--- 2. Deploying Frontend ---")
        deploy_archive("autoflow_frontend.tar.gz", "dist", "/home/vhvxoigh/automation.ideas.edu.vn/")
    else:
        print("\nWarning: dist/ folder not found. Skipping frontend deployment.")
        
    print("\n=== DEPLOYMENT COMPLETED ===")

if __name__ == '__main__':
    main()
