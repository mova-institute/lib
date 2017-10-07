export CUDA_INSTALLER=https://developer.nvidia.com/compute/cuda/8.0/Prod2/local_installers/cuda-repo-ubuntu1604-8-0-local-ga2_8.0.61-1_amd64-deb

set -x
echo "termcapinfo xterm* ti@:te@" >> ~/.screenrc
echo "startup_message off" >> ~/.screenrc
screen

sudo apt-get update &&
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -yq &&
sudo apt-get -y install htop build-essential &&

# ~~~~~~ install cuda
wget $CUDA_INSTALLER -O cuda.deb &&
sudo dpkg -i cuda.deb &&
# sudo apt-key add /var/cuda-repo-9-0-local/7fa2af80.pub &&
sudo apt-get update &&
sudo apt-get -y install cuda &&
rm cuda.deb &&
# echo 'export CUDA_HOME=/usr/local/cuda' >> ~/.bashrc &&
# echo 'export PATH=”$CUDA_HOME/bin:$PATH”' >> ~/.bashrc &&
# sudo reboot

# ~~~~~~ install cudnn
# cat /proc/driver/nvidia/version
tar -xzvf cudnn-* &&
rm cudnn-* &&
sudo cp cuda/include/cudnn.h /usr/local/cuda/include &&
sudo cp cuda/lib64/libcudnn* /usr/local/cuda/lib64 &&
sudo chmod a+r /usr/local/cuda/include/cudnn.h /usr/local/cuda/lib64/libcudnn* &&
rm -rf cuda &&

# ~~~~~~ install specific version of bazel
sudo apt-get install -y pkg-config zip g++ zlib1g-dev unzip python &&
wget https://github.com/bazelbuild/bazel/releases/download/0.5.4/bazel-0.5.4-installer-linux-x86_64.sh &&
chmod +x bazel-0.5.4-installer-linux-x86_64.sh &&
./bazel-0.5.4-installer-linux-x86_64.sh --user &&
echo 'PATH="$PATH:$HOME/bin"' >> ~/.bashrc &&
source ~/.bashrc &&
rm bazel-0.5.4-installer-linux-x86_64.sh

# ~~~~~~ setup virtualenv
cd
sudo apt-get install -y python-pip python-dev python-virtualenv &&
virtualenv --system-site-packages ~/virtualenv/tensorflow13 &&
source ~/virtualenv/tensorflow13/bin/activate

# ~~~~~~ build tensorflow
sudo apt-get -y install python-numpy python-dev python-pip python-wheel
sudo apt-get -y install libcupti-dev
cd
mkdir sourcedist &&
cd sourcedist &&
git clone https://github.com/tensorflow/tensorflow &&
cd tensorflow &&
git checkout r1.3 &&
export TF_NEED_CUDA=1
yes '' | ./configure &&
bazel build --config=opt --config=cuda //tensorflow/tools/pip_package:build_pip_package &&
bazel-bin/tensorflow/tools/pip_package/build_pip_package /tmp/tensorflow_pkg &&
pip install /tmp/tensorflow_pkg/tensorflow-1.3.*
