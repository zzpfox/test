import React, { useState } from 'react';
import { ImageProps, Skeleton } from '@chakra-ui/react';
import MyPhotoView from '@fastgpt/web/components/common/Image/PhotoView';
import { useBoolean } from 'ahooks';

const MdImage = ({ src, ...props }: { src?: string } & ImageProps) => {
  const [isLoaded, { setTrue }] = useBoolean(false);

  const [renderSrc, setRenderSrc] = useState(src);

  return (
    <Skeleton isLoaded={isLoaded}>
      <MyPhotoView
        borderRadius={'md'}
        src={renderSrc}
        alt={''}
        fallbackSrc={'/imgs/errImg.png'}
        fallbackStrategy={'onError'}
        loading="lazy"
        objectFit={'contain'}
        referrerPolicy="no-referrer"
        minW={'120px'}
        minH={'120px'}
        maxH={'500px'}
        my={1}
        mx={'auto'}
        onLoad={() => {
          setTrue();
        }}
        onError={() => {
          setRenderSrc('/imgs/errImg.png');
          setTrue();
        }}
        {...props}
      />
    </Skeleton>
  );
};

export default MdImage;
