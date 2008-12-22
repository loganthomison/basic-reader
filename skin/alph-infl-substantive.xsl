<?xml version="1.0" encoding="UTF-8"?>

<!--
    Stylesheet for transformation of substantive (noun and adjective) 
    inflection data to HTML
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" exclude-result-prefixes="xs"
    xmlns:exsl="http://exslt.org/common"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    <!--
        This stylesheet groups the data on 3 attributes for the rows, 
        and groups on 3 attributes for the columns.
        Grouping attributes are supplied as parameters.
        Grouping parameters are required.
        A optional ending parameter can be used to identify the ending
        to be indicated as 'selected' in the HTML table.     
    -->
    
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
                
    <!-- all parameters may be supplied in transformation -->
    <!-- row groupings --> 
    <!-- default order is Number, Case -->
    
    <xsl:param name="group1" select="'num'"/>
    <xsl:param name="group2" select="'case'"/>
    
    <!-- column groupings -->
    <!-- default order is Declension, Gender-->
    <xsl:param name="group4" select="'decl'"/>
    <xsl:param name="group5" select="'gend'"/>
    <xsl:param name="group6" select="'type'"/>

    <!-- the following are optional, used to select specific inflection ending(s) -->
    <xsl:param name="selected_endings" select="/.." />
    <xsl:param name="form" />
    
    <!-- by default greek vowel length is stripped but this can be overridden -->
    <xsl:param name="strip_greek_vowel_length" select="true()"/>
    
    <!-- transliterate unicode in the ending tables before matching? -->
    <xsl:param name="translit_ending_table_match" select="false()"/>
    <!-- by default this stylesheet applies to nouns, but may also be
         used for adjectives or other parts of speech -->
    <xsl:param name="match_pofs" select="'noun'"/>
    
    <!-- Flag to request that endings be deduped according to a specific
         set of attributes. The only supported value currently is 'case-num-gend'
    -->
    <xsl:param name="dedupe_by" select="''"/>
    
    <!--xsl:param name="form" select="'Μοῦσα'"/-->
    
    <!-- debug -->
    <xsl:param name="test_endings">
        <div class="alph-entry">
            <div class="alph-dict">
                <span class="alph-hdwd">Μοῦσα: </span>
                <span context="noun" class="alph-pofs">
                    <span class="alph-attr">feminine</span>noun
                </span>
            </div>
            <div class="alph-mean">the Muse</div>
            <div context="μοῦσα" class="alph-infl-set">
                <span class="alph-term">μοῡσ•<span class="alph-suff">α</span></span>
                <div class="alph-infl">Singular: 
                    <span context="nominative-singular-feminine-noun" class="alph-case">nominative</span>
                    <span context="vocative-singular-feminine-noun" class="alph-case">vocative</span>
                </div>
            </div>
          </div>
          <!--
            <div class="alph-entry">
                <div class="alph-dict">
                    <span class="alph-hdwd">νόστος: </span>
                    <span context="noun" class="alph-pofs">
                        <span class="alph-attr">masculine</span>noun</span>
                </div>
                <div class="alph-mean">a return home</div>
                <div context="νόστον" class="alph-infl-set">
                    <span class="alph-term">νόστον
                        <span class="alph-suff"></span>
                    </span>
                    <div class="alph-infl">Singular: 
                        <span context="accusative-singular-masculine-noun" class="alph-case">accusative</span>
                    </div>
                </div>
            </div-->
    </xsl:param>
    <!--xsl:param name='selected_endings' select="exsl:node-set($test_endings)"/-->
    
    <!-- skip the enclosing html and body tags -->
    <xsl:param name="fragment" />
        
    <xsl:template match="/">
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:call-template name="infltable">
                    <xsl:with-param name="endings" select="//infl-ending-set"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl.css"/>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-{$match_pofs}.css"/>
                    </head>
                    <body>
                        <xsl:call-template name="infltable">
                            <xsl:with-param name="endings" select="//infl-ending-set"/>
                        </xsl:call-template>                     
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
     
    <xsl:template name="infltable">
        <xsl:param name="endings" />
        <table id="alph-infl-table"> <!-- start table -->
            <caption>
                <xsl:for-each select="$selected_endings//span[@class='alph-term']">
                    <xsl:if test="position() &gt; 1">
                        , 
                    </xsl:if>
                    <div class="alph-infl-term"><xsl:copy-of select="current()"/></div>    
                </xsl:for-each>                
            </caption>
            <!-- write the colgroup elements -->
            <xsl:call-template name="colgroups">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
            </xsl:call-template>        
            <!-- write the column header rows -->
            <xsl:call-template name="headers">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
            </xsl:call-template>
            <!-- debugging 
            <pre class="debug">
                group1: <xsl:value-of select="$group1"/>
                group2: <xsl:value-of select="$group2"/>
                group4: <xsl:value-of select="$group4"/>
                group5: <xsl:value-of select="$group5"/>
                <xsl:copy-of select="$selected_endings"/>
            </pre>
            -->
            <!-- gather first level row grouping:
                all attribute values for group1 attribute -->
            <xsl:variable name="firstgroup" select="$endings/@*[local-name(.)=$group1]"/>
            <!-- iterate though the items in the first group -->
            <xsl:for-each select="$firstgroup">
                <!-- lookup sort order for this attribute from order-table in the inflection data -->
                <xsl:sort 
                    select="/infl-data/order-table/order-item[@attname=$group1 
                    and text()=current()]/@order" 
                    data-type="number"/>
                <!-- if this is the first instance of this attribute value proceed to 
                    2nd level grouping -->
                <xsl:if test="generate-id(.) = generate-id($firstgroup[.=current()])">
                    <xsl:variable name="lastgroup1" select="."/>
                    <!-- gather second level row grouping:
                        all group2 attribute values 
                        from all elements whose group1 attribute matches the current group1 value  
                    -->                    
                    <xsl:variable name="secondgroup" 
                        select="$endings/@*[local-name(.)=$group1 
                        and .=$lastgroup1]/../@*[local-name(.)=$group2]"/>                    
                    <!-- first instance of group1 row so add header row -->
                    <!-- TODO colspan should not be hardcoded -->
                    <tr id="header-{$lastgroup1}" class="group1row">
                        <th class="header-text always-visible" colspan="2">
                            <xsl:value-of select="$lastgroup1"/>
                            <xsl:call-template name="add-footnote">
                                <xsl:with-param name="item"
                                    select="/infl-data/order-table/order-item[@attname=$group1 
                                    and text()=$lastgroup1]" />
                            </xsl:call-template>                            
                        </th>
                        <xsl:call-template name="headerrow">
                            <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                            <xsl:with-param name="headerrow2" select="//order-item[@attname=$group5]"/>
                            <xsl:with-param name="headerrow3" select="//order-item[@attname=$group6]"/>
                        </xsl:call-template>        
                    </tr>
                    <!-- if none in 2nd group, just add the items in the first group -->                    
                    <xsl:if test="count($secondgroup) = 0">
                        <tr class="data-row">
                            <th class="emptyheader" colspan="2">&#160;</th>
                            <xsl:for-each select="$endings/@*[local-name(.)=$group1 and .=$lastgroup1]/..">
                                <xsl:variable name="selected">
                                    <xsl:call-template name="check_infl_sets">
                                        <xsl:with-param name="current_data" select="." />
                                    </xsl:call-template>
                                </xsl:variable>                                
                                <xsl:call-template name="ending-cell">
                                    <xsl:with-param name="infl-endings" select="infl-ending"/>
                                    <xsl:with-param name="selected" select="$selected"/>
                                </xsl:call-template>                                    
                            </xsl:for-each>
                        </tr>
                    </xsl:if>                                         
                    
                    <!-- iterate through the items in the second group -->
                    <xsl:for-each select="$secondgroup">
                        <xsl:sort select="/infl-data/order-table/order-item[@attname=$group2 
                            and text()=current()]/@order" data-type="number"/>
                            <!-- start a new row to hold the data if this is the first instance of 
                                this attribute value -->
                            <xsl:if test="generate-id(.) = generate-id($secondgroup[.=current()])">
                                <xsl:variable name="lastgroup2" select="."/>
                                <xsl:variable name="row_id" select="concat($lastgroup1,$lastgroup2)"/>
                                <tr class="data-row" id="{$row_id}"> <!-- start new row -->
                                    <th class="emptyheader">&#160;</th>
                                    <!-- gather the actual ending data in this grouping:
                                        all elements whose 
                                        - group1 attribute matches the current group1 value and
                                        - group2 attribute matches the current group2 value
                                    -->
                                    <xsl:variable name="data"
                                        select="$endings/@*[local-name(.)=$group1 
                                        and .=$lastgroup1]/../@*[local-name(.)=$group2 
                                        and . = $lastgroup2]/.."/>
                                    <xsl:call-template name="rowgroup">
                                        <xsl:with-param name="data" select="$data"/>
                                        <xsl:with-param name="groupheader" select="$lastgroup2"/>
                                        <xsl:with-param name="colgroup" select="$lastgroup1"/> 
                                    </xsl:call-template>
                                </tr> 
                            </xsl:if>
                    </xsl:for-each>                                  
                </xsl:if>
            </xsl:for-each>            
        </table> <!-- end infl table -->
    </xsl:template>
    
    <!-- template to write a group of rows of infl-ending data to the table -->
    <xsl:template name="rowgroup">
        <xsl:param name="data"/>
        <xsl:param name="groupheader"/>
        <xsl:param name="colgroup"/>
        <xsl:variable name="group4_vals" select="//order-item[@attname=$group4]"/>
        <xsl:variable name="group5_vals" select="//order-item[@attname=$group5]"/>
        <!--td class="ending-group"--> <!-- start new cell -->
        <!---
            for each group4 (decl)
            for each group5 (gend)
            if the set doesn't have a match on group4 and group5 then print an empty cell
        -->
        <xsl:for-each select="$group4_vals">
            <xsl:sort 
                select="@order"/>
            <xsl:variable name="lastgroup4" select="."/>
            <xsl:if test="position()=1">
                <!-- add the row header cell if it's the first cell in 
                    the row -->
                <th class="rowgroupheader header-text">
                    <xsl:value-of select="$groupheader"/>
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="/infl-data/order-table/order-item[@attname=$groupheader]"/>
                    </xsl:call-template>
                </th>
            </xsl:if>            
            <xsl:for-each select="$group5_vals">
                <xsl:sort select="@order"/> 
                <xsl:variable name="lastgroup5" select="."/>
                <xsl:variable name="celldata"
                    select="$data/@*[local-name(.)=$group4 
                    and .=$lastgroup4]/../@*[local-name(.)=$group5 
                    and . = $lastgroup5]/.."/>
                <!--xsl:choose>
                    <xsl:when test="count($celldata) = 0">
                        <td class="emptycell {$lastgroup4} {$lastgroup5}">&#160;</td>
                    </xsl:when>
                    <xsl:otherwise-->
                        <xsl:variable name="selected">
                            <xsl:call-template name="check_infl_sets">
                                <xsl:with-param name="current_data" select="$celldata" />
                            </xsl:call-template>
                        </xsl:variable>
                        <xsl:call-template name="ending-cell">
                            <xsl:with-param name="infl-endings" select="$celldata"/>
                            <xsl:with-param name="selected" select="$selected"/>
                        </xsl:call-template>
                    <!--/xsl:otherwise>
                </xsl:choose-->
            </xsl:for-each>
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template name="ending-cell">
        <xsl:param name="infl-endings"/>
        <xsl:param name="selected"/>
        <xsl:variable name="ending_types" select="//order-item[@attname=$group6]"/>
                <!-- group by type -->
                <xsl:for-each select="$ending_types">
                    <xsl:sort 
                        select="/infl-data/order-table/order-item[@attname=$group6 
                        and text()=current()]/@order"/>
                    <xsl:if test="generate-id(.) = generate-id($ending_types[.=current()])">
                        <xsl:variable name="lasttype" select="."/>
                        <td class="ending-group {$lasttype}"> <!-- start new cell -->
                            <xsl:variable name="cellgroup" 
                                select="$infl-endings/infl-ending/@*[local-name(.)=$group6 
                                        and contains(concat(' ',(.),' '), concat(' ',$lasttype,' '))]/.."/>
                            <!-- print an empty cell if there are no endings of this type -->
                            <xsl:if test="count($cellgroup) = 0"><span class="emptycell">&#160;</span></xsl:if>
                            <xsl:for-each select="$cellgroup">
                                <xsl:variable name="stripped-ending">
                                    <xsl:choose>
                                        <!-- if requested, transliterate the ending in the table for matching -->
                                        <xsl:when test="$translit_ending_table_match">
                                            <xsl:call-template name="uni-to-ascii">
                                                <xsl:with-param name="input" select="."/>
                                            </xsl:call-template>
                                        </xsl:when>
                                        <!-- if we're not transliterating, we may need to   
                                             strip greek vowels -->
                                        <xsl:when test="$strip_greek_vowel_length = true()">
                                            <xsl:call-template name="uni-strip">
                                                <xsl:with-param name="input" select="."/>
                                                <xsl:with-param name="strip-vowels" select="true()"/>
                                                <xsl:with-param name="strip-caps" select="false()"/>
                                            </xsl:call-template>                              
                                        </xsl:when>
                                        <!-- otherwise use the ending as-is -->
                                        <xsl:otherwise>
                                            <xsl:value-of select="."/>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </xsl:variable>
                                <xsl:variable name="selected_class">
                                    <xsl:choose>
                                        <!-- if this inflection-set is selected by it's attributes AND
                                            the ending matches the one supplied in the template params
                                            then add a 'selected' class to the data element -->                                        
                                        <xsl:when test="contains($selected,concat(',',$stripped-ending,','))">selected</xsl:when>
                                        <!-- otherwise add the class 'matched' to indicate that the ending matches but
                                        the form attributes don't -->
                                        <xsl:otherwise>
                                            <xsl:choose>
                                            <xsl:when test="$strip_greek_vowel_length = true()
                                                and count
                                                ($selected_endings//span
                                                [@class='alph-suff' and 
                                                translate(text(),
                                                $uni-with-length,
                                                $uni-without-length) 
                                                = $stripped-ending]
                                                ) &gt; 0">matched</xsl:when>
                                            <xsl:when test="$strip_greek_vowel_length = false()
                                                    and count
                                                    ($selected_endings//span
                                                    [@class='alph-suff' and 
                                                    text() = $stripped-ending]
                                                    ) &gt; 0">matched</xsl:when>
                                            </xsl:choose>  
                                        </xsl:otherwise>        
                                    </xsl:choose>                                                                                
                                </xsl:variable>
                                <xsl:variable name="notfirst">
                                    <xsl:if test="position() &gt; 1">notfirst</xsl:if>
                                </xsl:variable>
                                <xsl:variable name="this_case" select="../@case"/>
                                <xsl:variable name="this_num" select="../@num"/>
                                <xsl:variable name="this_gend" select="../@gend"/>
                                <xsl:variable name='duplicate'>
                                    <xsl:if test="$dedupe_by='case-num-gend'
                                            and ../preceding-sibling::infl-ending-set[@case=$this_case and 
                                            @gend = $this_gend and @num = $this_num]/infl-ending/text() = .">duplicate</xsl:if>
                                </xsl:variable>                                        
                                    <span class="ending {@type} {$selected_class} {$notfirst} {$duplicate}" 
                                        stem-class="{@stem-class}">
                                        <xsl:value-of select="."/>
                                    </span>
                                    <xsl:call-template name="add-dialect">
                                        <xsl:with-param name="item" select="."/>
                                    </xsl:call-template>                        
                                    <xsl:call-template name="add-footnote">
                                        <xsl:with-param name="item" select="."/>
                                    </xsl:call-template>
                            </xsl:for-each>
                        </td>                                   
                    </xsl:if>
                </xsl:for-each>
        <!--/td-->
    </xsl:template>
    
    <!-- template to produce header rows for the table columns -->    
    <xsl:template name="headers">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/> 
        <xsl:variable name="row3count" select="count($headerrow3)"/>
        <tr id="headerrow1">
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group4"/></span>    
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group4"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>
                <xsl:variable name="colspan" 
                    select="$row2count*$row3count"/>
                    <th colspan="{$colspan}">
                        <span class="header-text"><xsl:value-of select="."/></span>
                        <xsl:apply-templates select="."/>
                    </th>
            </xsl:for-each>            
        </tr>
        <tr id="headerrow2">
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group5"/></span>
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group5"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>               
                <xsl:for-each select="$headerrow2">
                    <xsl:sort select="@order" data-type="number"/>
                    <th colspan="{$row3count}">
                         <span class="header-text" ><xsl:value-of select="."/></span>
                         <xsl:apply-templates select="."/>                        
                     </th>        
                </xsl:for-each>
            </xsl:for-each>
        </tr>
        <!--
        <tr id="headerrow3">
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group6"/></span>
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group6"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>               
                <xsl:for-each select="$headerrow2">
                    <xsl:sort select="@order" data-type="number"/>
                    <xsl:for-each select="$headerrow3">
                        <xsl:sort select="@order" data-type="number"/>
                        <th>
                            <span class="header-text" ><xsl:value-of select="."/></span>
                            <xsl:apply-templates select="."/>                        
                        </th>
                    </xsl:for-each>
                </xsl:for-each>
            </xsl:for-each>
        </tr>
        -->
        
    </xsl:template>
    
    <!-- template to produce header for stem header row -->
    <xsl:template name="stem-header">
        <xsl:param name="header"/>
        <xsl:if test="$header='decl'">
            <br/><span class="header-text">stem</span>
        </xsl:if>
    </xsl:template>
    
    <!-- template to produce data for stem header row -->
    <xsl:template name="stem-data" match="order-item[@attname='decl']">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>                                
        <br/>
        <xsl:variable name="thisdecl" select="text()"/>
        <xsl:apply-templates select="/infl-data/stem-table/stem[@decl=$thisdecl]"/>
    </xsl:template>

    <xsl:template name="no-sub" match="order-item">
        <xsl:call-template name="add-footnote">
            <xsl:with-param name="item" select="."/>
        </xsl:call-template>        
    </xsl:template>
    
    <xsl:template match="stem">
        <span class="stem"><xsl:value-of select="text()"/></span>
        <xsl:if test="stem-class">
            <ul class="stem-class-block">
                <li class="stem-class-toggle header-text">stem-classes</li>
                <ul class="stem-classes">
                        <xsl:apply-templates select="stem-class"/>                
                </ul>
            </ul>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="stem-class">
        <li id="{@id}" class="{@type}"><span class="stem-class-desc"><xsl:apply-templates select="reflink"/></span></li>        
    </xsl:template>
    
    
    <!-- template to produce colgroups for the table columns -->
    <xsl:template name="colgroups">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <xsl:variable name="row3count" select="count($headerrow3)"/>
        <colgroup class="leftheader">
            <col realIndex="0"/>
            <col realIndex="1"/>
        </colgroup>
        <xsl:for-each select="$headerrow1">
            <xsl:variable name="row1pos" select="position()-1"/>            
            <colgroup class="header1">              
                <xsl:for-each select="$headerrow2">
                    <xsl:variable name="row2pos" select="position()-1"/>
                    <xsl:for-each select="$headerrow3">
                        <xsl:variable name="row3pos" select="position()-1"/>
                        <xsl:variable name="index" 
                            select="($row1pos * $row3count * $row2count) + 
                            ($row2pos * $row3count) + position() + 1"/>
                            <col class="header3col" realIndex="{$index}" 
                                row1pos="{$row1pos}"
                                row2pos="{$row2pos}"
                                row3pos="{$row3pos}"/>
                    </xsl:for-each>
                </xsl:for-each>
            </colgroup>
        </xsl:for-each>       
    </xsl:template>
    
    <xsl:template name="headerrow">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <xsl:variable name="row2count" select="count($headerrow2)"/>
        <xsl:for-each select="$headerrow1">
                <xsl:for-each select="$headerrow2">
                    <xsl:for-each select="$headerrow3">
                        <td>&#160;</td>
                    </xsl:for-each>
                </xsl:for-each>
        </xsl:for-each>       
    </xsl:template>
    
    <xsl:template name="add-footnote">
        <xsl:param name="item"/>
        <xsl:if test="$item/@footnote">
            <xsl:call-template name="footnote-tokens">
                <xsl:with-param name="list" select="$item/@footnote"/>
                <xsl:with-param name="delimiter" select="' '"/>
            </xsl:call-template>   
        </xsl:if>
    </xsl:template>    

    <xsl:template name="add-dialect">
        <xsl:param name="item"/>
        <xsl:if test="$item/@dialects">
            <a href="#dialect" class="footnote">D</a>
            <span class="footnote-text"><xsl:value-of select="$item/@dialects"/></span>
            <xsl:if test="$item/@footnote">
                <span class="footnote-delimiter">,</span>
            </xsl:if>
        </xsl:if>
    </xsl:template>    
    
    
    <xsl:template name="check_infl_sets">
        <xsl:param name="current_data"/>
        <xsl:variable name="matches">
            <xsl:for-each select="$selected_endings//div[@class='alph-infl-set' and 
                ../div[@class='alph-dict']/span[(@class='alph-pofs') and (@context = $match_pofs)]]
                ">                    
              <xsl:variable name="ending_match">
                  <xsl:choose>
                      <xsl:when test="$strip_greek_vowel_length = true()">
                          <xsl:call-template name="uni-strip">
                              <xsl:with-param name="input" select="span[@class='alph-term']/span[@class='alph-suff']"/>
                              <xsl:with-param name="strip-vowels" select="true()"/>
                              <xsl:with-param name="strip-caps" select="false()"/>
                          </xsl:call-template>                              
                      </xsl:when>
                      <xsl:otherwise>
                          <xsl:value-of select="span[@class='alph-term']/span[@class='alph-suff']"/>
                      </xsl:otherwise>
                  </xsl:choose>
                </xsl:variable>
                <xsl:variable name="possible">
                    <xsl:for-each select="div[@class='alph-infl']">
                        <xsl:call-template name="find_infl_match">
                            <xsl:with-param name="current_data" select="$current_data"/>
                            <xsl:with-param name="filtered_data" select="(.)"/>
                        </xsl:call-template>
                    </xsl:for-each>
                </xsl:variable>
                <xsl:if test="$possible &gt; 0">,<xsl:value-of select="$ending_match"/>,</xsl:if>
            </xsl:for-each>    
        </xsl:variable>
        <xsl:value-of select="$matches"/>
    </xsl:template>
    
    <xsl:template name="find_infl_match">
        <xsl:param name="current_data"/>
        <xsl:param name="filtered_data"/>
        <xsl:param name="att_pos" select="0"/>
        
        <xsl:variable name="match_case_num"><xsl:value-of select="$current_data/@case"/>-<xsl:value-of select="$current_data/@num"/>-</xsl:variable>
        <xsl:variable name="match_gend"><xsl:value-of select="$current_data/@gend"/></xsl:variable>
        <xsl:variable name="match_decl"><xsl:value-of select="$current_data/@decl"/></xsl:variable>
        
        <xsl:choose>
            <!-- if we have the declension, match on it -->
            <xsl:when test="count($filtered_data/../..//span[@class='alph-decl' 
                and contains(@context,$match_decl)]) > 0">
                <xsl:value-of select="count($filtered_data//span[@class='alph-case'
                    and starts-with(@context,$match_case_num)
                    and contains(@context,$match_pofs)
                    and contains($match_gend,substring-before(substring-after(@context,$match_case_num),concat('-',$match_pofs)))
                    ])"/>                                
            </xsl:when>
            <!-- if we don't have a declension in the supplied selected ending data, just ignore it -->
            <xsl:when test="count($filtered_data/../..//span[@class='alph-decl']) = 0">
                <xsl:value-of select="count($filtered_data//span[@class='alph-case'
                    and starts-with(@context,$match_case_num)
                    and contains(@context,$match_pofs)
                    and contains($match_gend,substring-before(substring-after(@context,$match_case_num),concat('-',$match_pofs)))
                    ])"/>                
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>
        </xsl:template>    
    
    <xsl:template name="footnote-tokens">
        <xsl:param name="list" />
        <xsl:param name="delimiter" />
        <xsl:variable name="newlist">
            <xsl:choose>
                <xsl:when test="contains($list, $delimiter)"><xsl:value-of select="normalize-space($list)" /></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(normalize-space($list), $delimiter)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="first" select="substring-before($newlist, $delimiter)" />
        <xsl:variable name="remaining" select="substring-after($newlist, $delimiter)" />
        <xsl:variable name="num" select="substring-after($first,'-')"/>
        <a href="#{$first}" class="footnote"><xsl:value-of select="$num"/></a>
        <span class="footnote-text"><xsl:apply-templates select="key('footnotes',$first)"/></span>
        <xsl:if test="$remaining">
            <span class="footnote-delimiter">,</span>
            <xsl:call-template name="footnote-tokens">
                <xsl:with-param name="list" select="$remaining" />
                <xsl:with-param name="delimiter"><xsl:value-of select="$delimiter"/></xsl:with-param>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="reflink">
        <a href="{@xlink:href}" class="alph-reflink"><xsl:value-of select="."/></a>
    </xsl:template>
        
    <xsl:template match="ul">
        <xsl:copy-of select="."/>
    </xsl:template>
</xsl:stylesheet>
