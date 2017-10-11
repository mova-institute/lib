mount_data() {
  cd
  mkdir env
  sudo mount /dev/xvdf env
}

init_volume() {
  sudo mkfs -t ext4 /dev/xvdf
  mount_data
  sudo chown -R ubuntu.ubuntu env
  rm -rf ~/env/*
}

on_clean_vm() {
  sudo apt-get update
  sudo apt-get -y upgrade
  sudo apt-get -y install pypy python-pip
}

cd
mount_data
cd env

sudo apt-get update
sudo apt-get -y upgrade
sudo apt-get -y install pypy python-pip python-dev python-virtualenv

mkdir -p virtualenv
virtualenv --system-site-packages virtualenv/main
source virtualenv/main/bin/activate

pip install lxml justext

mkdir -p sourcedist
cd sourcedist
wget http://corpus.tools/raw-attachment/wiki/Downloads/spiderling-src-0.84.tar.xz
mkdir spiderling-src-0.84
tar -xf spiderling-src-0.84.tar.xz -C spiderling-src-0.84
rm spiderling-src-0.84.tar.xz

# wget http://corpus.tools/raw-attachment/wiki/Downloads/justext-1.4.tar.gz
# tar xzvf justext-1.4.tar.gz
# cd justext-1.4/
# python setup.py install

wget http://corpus.tools/raw-attachment/wiki/Downloads/chared-1.2.2.tar.gz &&
tar xzvf chared-1.2.2.tar.gz &&
cd chared-1.2.2/ &&
python setup.py install &&
cd ..
